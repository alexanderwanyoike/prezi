import type { SceneJob } from '../../shared/scene-jobs';

export function SceneJobFeedback({
  job,
  error,
  conflict,
}: {
  job: SceneJob | null;
  error: string | null;
  conflict: boolean;
}): React.JSX.Element | null {
  if (error)
    return (
      <div className="source-feedback" role="alert">
        {error}
      </div>
    );
  if (conflict)
    return (
      <div className="source-feedback" role="status">
        The working scene changed after this draft started. Your draft is retained. Discard it to
        load the current source, or explicitly apply it anyway.
      </div>
    );
  if (!job) return null;
  if (job.state === 'failed')
    return (
      <div className="source-feedback" role="alert">
        <strong>{job.error?.message ?? 'The scene could not be applied.'}</strong>
        {job.error?.diagnostics?.map((item, index) => (
          <div key={`${item.file}:${String(index)}`}>
            {item.file}:{item.line}:{item.column} / {item.message}
          </div>
        ))}
      </div>
    );
  let message = 'Source applied.';
  if (job.state === 'queued') message = 'Waiting for the scene worker…';
  if (job.state === 'compiling') message = 'Compiling and checking scene types…';
  if (job.state === 'validating') message = 'Checking the rendered scene and its reveals…';
  if (job.state === 'cancelled') message = 'Cancelled. The working scene and draft were retained.';
  return (
    <div className="source-feedback" role="status">
      {message}
    </div>
  );
}
