import type { Compilation, SceneSource } from '../../shared/custom-scene';

export class CompilerQueue {
  constructor(
    private readonly run: (source: SceneSource, signal: AbortSignal) => Promise<Compilation>,
  ) {}

  compile(source: SceneSource, signal: AbortSignal): Promise<Compilation> {
    return this.run(source, signal);
  }
}
