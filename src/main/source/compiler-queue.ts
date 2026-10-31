import type { Compilation, SceneSource } from '../../shared/custom-scene';

interface PendingCompilation {
  source: SceneSource;
  signal: AbortSignal;
  resolve: (result: Compilation) => void;
  removeAbort: () => void;
}
function rejected(message: string): Compilation {
  return { ok: false, error: { code: 'INVALID_INPUT', message, diagnostics: [] } };
}
export class CompilerQueue {
  private active = false;

  private pending: PendingCompilation[] = [];

  constructor(
    private readonly run: (source: SceneSource, signal: AbortSignal) => Promise<Compilation>,
  ) {}

  compile(source: SceneSource, signal: AbortSignal): Promise<Compilation> {
    if (signal.aborted) return Promise.resolve(rejected('Scene compilation was cancelled.'));
    if (this.pending.length >= 3)
      return Promise.resolve(rejected('The compiler queue is full. Wait for the current jobs.'));
    return new Promise((resolve) => {
      const abort = (): void => {
        this.pending = this.pending.filter((job) => job.resolve !== resolve);
        signal.removeEventListener('abort', abort);
        resolve(rejected('Scene compilation was cancelled.'));
      };
      signal.addEventListener('abort', abort, { once: true });
      this.pending.push({
        source: structuredClone(source),
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
    try {
      job.resolve(await this.run(job.source, job.signal));
    } catch {
      job.resolve(rejected('The compiler worker failed. The working scene was preserved.'));
    } finally {
      this.active = false;
      void this.advance();
    }
  }
}
