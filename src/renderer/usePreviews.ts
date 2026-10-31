import { useEffect, useState } from 'react';
import type { PreviewJob, PreviewRequest } from '../shared/preview';

function retain(jobs: PreviewJob[]): PreviewJob[] {
  const retained = [...jobs];
  let bytes = retained.reduce((sum, job) => sum + (job.image?.dataUrl.length ?? 0), 0);
  while (retained.length > 16 || bytes > 2 * 1024 * 1024) {
    const removed = retained.shift();
    bytes -= removed?.image?.dataUrl.length ?? 0;
  }
  return retained;
}
export function usePreviews() {
  const [jobs, setJobs] = useState<PreviewJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const unsubscribe = window.prezi.subscribePreviews((job) => {
      setJobs((previous) => retain([...previous.filter((item) => item.id !== job.id), job]));
      if (job.error) setError(job.error.message);
    });
    void window.prezi.previews().then((result) => {
      if (!live) return;
      if (result.ok)
        setJobs((previous) =>
          retain([
            ...result.value.filter((item) => !previous.some((job) => job.id === item.id)),
            ...previous,
          ]),
        );
      else setError(result.error.message);
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);
  const capture = (request: PreviewRequest): void => {
    setError(null);
    void window.prezi.capturePreview(request).then((result) => {
      if (result.ok)
        setJobs((previous) =>
          retain([...previous.filter((item) => item.id !== result.value.id), result.value]),
        );
      else setError(result.error.message);
    });
  };
  const cancel = (id: string): void => {
    void window.prezi.cancelPreview(id).then((result) => {
      if (result.ok)
        setJobs((previous) => previous.map((job) => (job.id === id ? result.value : job)));
      else setError(result.error.message);
    });
  };
  return { jobs, error, capture, cancel };
}
