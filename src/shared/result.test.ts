import { expect, it } from 'vitest';
import { errorCodes, failure } from './result';
import { snapshotResultSchema, fullscreenResultSchema } from './desktop';
import { updateResultSchema } from './updates';
import { sceneJobResultSchema } from './scene-jobs';
import { previewResultSchema, previewListResultSchema } from './preview';
import { compilationSchema } from './custom-scene';

it('preserves every typed failure across application result boundaries', () => {
  errorCodes.forEach((code) => {
    const result = failure(code, 'Boundary failure');
    [
      snapshotResultSchema,
      fullscreenResultSchema,
      updateResultSchema,
      sceneJobResultSchema,
      previewResultSchema,
      previewListResultSchema,
    ].forEach((schema) => {
      expect(schema.parse(result)).toEqual(result);
    });
    expect(
      compilationSchema.parse({
        ok: false,
        error: { code, message: 'Boundary failure', diagnostics: [] },
      }),
    ).toMatchObject(result);
  });
});
