import { posix } from 'node:path';
import { build } from 'esbuild';
import { z } from 'zod';
import { sceneSourceSchema } from '../../shared/custom-scene';
import type { Compilation, SceneSource } from '../../shared/custom-scene';

const buildErrorSchema = z.object({
  errors: z.array(
    z.object({
      text: z.string(),
      location: z.object({ file: z.string(), line: z.number(), column: z.number() }).nullable(),
    }),
  ),
});
export async function compileScene(
  source: SceneSource,
  _libraries?: Record<string, string>,
): Promise<Compilation> {
  const invalid = (message: string): Compilation => ({
    ok: false,
    error: {
      code: 'INVALID_INPUT',
      message: 'The scene could not be compiled.',
      diagnostics: [{ file: source.entry, line: 1, column: 1, message }],
    },
  });
  if (!sceneSourceSchema.safeParse(source).success || !source.entry.endsWith('.tsx'))
    return invalid('Use a TSX entry with at most 32 files and 1 MB of source.');
  try {
    const output = await build({
      entryPoints: [source.entry],
      bundle: true,
      write: false,
      platform: 'browser',
      format: 'cjs',
      jsx: 'automatic',
      target: 'es2022',
      logLevel: 'silent',
      plugins: [
        {
          name: 'prezi-scene-files',
          setup(builder) {
            builder.onResolve({ filter: /.*/ }, (input) => {
              if (['react', 'react/jsx-runtime', 'remotion', 'prezi'].includes(input.path))
                return { path: input.path, external: true };
              if (input.kind !== 'entry-point' && !input.path.startsWith('.'))
                return { errors: [{ text: `Unsupported module: ${input.path}` }] };
              const base = posix.normalize(
                posix.join(posix.dirname(input.importer || '.'), input.path),
              );
              const path = [base, `${base}.ts`, `${base}.tsx`, `${base}.json`].find((candidate) =>
                Object.hasOwn(source.files, candidate),
              );
              return path
                ? { path, namespace: 'scene' }
                : { errors: [{ text: `Missing scene file: ${input.path}` }] };
            });
            builder.onLoad({ filter: /.*/, namespace: 'scene' }, (input) => ({
              contents: source.files[input.path] ?? '',
              loader: input.path.endsWith('.json') ? 'json' : 'tsx',
            }));
          },
        },
      ],
    });
    const code = output.outputFiles[0]?.text;
    if (!code || Buffer.byteLength(code) > 2 * 1024 * 1024)
      return invalid('The compiled scene must be smaller than 2 MiB.');
    return { ok: true, value: { code } };
  } catch (error) {
    const parsed = buildErrorSchema.safeParse(error);
    if (!parsed.success) return invalid('The compiler could not complete this scene.');
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'The scene could not be compiled.',
        diagnostics: parsed.data.errors.slice(0, 50).map(({ text, location }) => ({
          file: location?.file.replace(/^scene:/, '') ?? source.entry,
          line: location?.line ?? 1,
          column: (location?.column ?? 0) + 1,
          message: text.slice(0, 2000),
        })),
      },
    };
  }
}
