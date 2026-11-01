import type { AppError } from '../../shared/result';

interface PendingWork<Input, Output> {
  input: Input;
  signal: AbortSignal;
  resolve: (result: Output) => void;
  removeAbort: () => void;
  started: () => void;
}
export class WorkQueue<Input, Output> {
  private active = false;

  private pending: PendingWork<Input, Output>[] = [];

  constructor(
    private readonly execute: (input: Input, signal: AbortSignal) => Promise<Output>,
    private readonly rejected: (message: string, code: AppError['code']) => Output,
    private readonly copy: (input: Input) => Input = structuredClone,
  ) {}

  enqueue(
    input: Input,
    signal: AbortSignal,
    started: () => void = () => undefined,
  ): Promise<Output> {
    if (signal.aborted)
      return Promise.resolve(this.rejected('Rendering work was cancelled.', 'CANCELLED'));
    if (this.pending.length >= 3)
      return Promise.resolve(
        this.rejected('The rendering queue is full. Wait for the current jobs.', 'CONFLICT'),
      );
    return new Promise((resolve) => {
      const abort = (): void => {
        this.pending = this.pending.filter((job) => job.resolve !== resolve);
        signal.removeEventListener('abort', abort);
        resolve(this.rejected('Rendering work was cancelled.', 'CANCELLED'));
      };
      signal.addEventListener('abort', abort, { once: true });
      this.pending.push({
        input: this.copy(input),
        started,
        signal,
        resolve,
        removeAbort: () => {
          signal.removeEventListener('abort', abort);
        },
      });
      void this.advance();
    });
  }

  private async advance(): Promise<void> {
    if (this.active) return;
    const job = this.pending.shift();
    if (!job) return;
    this.active = true;
    job.removeAbort();
    job.started();
    try {
      job.resolve(await this.execute(job.input, job.signal));
    } catch {
      job.resolve(
        this.rejected('The rendering worker failed. The working scene was preserved.', 'IO_ERROR'),
      );
    } finally {
      this.active = false;
      void this.advance();
    }
  }
}
