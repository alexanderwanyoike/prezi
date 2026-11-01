import { WorkQueue } from './work-queue';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export class RenderWork {
  private queue = new WorkQueue<() => Promise<Result<void>>, Result<void>>(
    (run) => run(),
    (message, code) => failure(code, message),
    (run) => run,
  );

  async run<T>(
    execute: () => Promise<Result<T>>,
    signal: AbortSignal,
    started: () => void = () => undefined,
  ): Promise<Result<T>> {
    let outcome: Result<T> = failure('CANCELLED', 'Rendering work was cancelled.');
    const queued = await this.queue.enqueue(
      async () => {
        outcome = await execute();
        return outcome.ok ? { ok: true, value: undefined } : outcome;
      },
      signal,
      started,
    );
    return queued.ok ? outcome : queued;
  }
}
