import { useEffect, useRef, useState } from 'react';
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
  const owned = useRef(new Set<string>());
  const [jobs, setJobs] = useState<PreviewJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const unsubscribe = window.prezi.subscribePreviews((job) => {
      setJobs((previous) => retain([...previous.filter((item) => item.id !== job.id), job]));
      if (owned.current.has(job.id) && job.error) setError(job.error.message);
      if (!['queued', 'rendering'].includes(job.state)) owned.current.delete(job.id);
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
    owned.current.add(request.requestId);
    void window.prezi.capturePreview(request).then((result) => {
      if (result.ok)
        setJobs((previous) =>
          retain([...previous.filter((item) => item.id !== result.value.id), result.value]),
        );
      else {
        owned.current.delete(request.requestId);
        setError(result.error.message);
      }
      if (result.ok && !['queued', 'rendering'].includes(result.value.state))
        owned.current.delete(request.requestId);
    });
  };
  const cancel = (id: string): void => {
    void window.prezi.cancelPreview(id).then((result) => {
      if (result.ok)
        setJobs((previous) => previous.map((job) => (job.id === id ? result.value : job)));
      else setError(result.error.message);
    });
  };
  const pending = jobs.find(
    (job) => owned.current.has(job.id) && ['queued', 'rendering'].includes(job.state),
  );
  return { jobs, pending, error, capture, cancel };
}
