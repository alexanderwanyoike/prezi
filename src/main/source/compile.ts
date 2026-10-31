import type { Compilation, SceneSource } from '../../shared/custom-scene';

export async function compileScene(_source: SceneSource): Promise<Compilation> {
  return Promise.resolve({
    ok: false,
    error: { code: 'INVALID_INPUT', message: 'Scene compilation is unavailable.', diagnostics: [] },
  });
}
