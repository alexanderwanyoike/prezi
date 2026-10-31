import type { Compilation, SceneSource } from '../../shared/custom-scene';

export async function runCompiler(
  _source: SceneSource,
  _signal: AbortSignal,
): Promise<Compilation> {
  return Promise.resolve({
    ok: false,
    error: { code: 'INVALID_INPUT', message: 'Compiler worker unavailable.', diagnostics: [] },
  });
}
