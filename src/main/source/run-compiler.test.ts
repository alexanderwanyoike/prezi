import { expect, it } from 'vitest';
import { runCompiler } from './run-compiler';

it('compiles in a separate bounded process and cancels before spawning', async () => {
  const source = {
    entry: 'Scene.tsx',
    files: {
      'Scene.tsx': 'export default function Scene() { return <div>A bounded scene</div>; }',
    },
  };
  const result = await runCompiler(source, new AbortController().signal);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.error.message);
  expect(result.value.code).toContain('A bounded scene');
  const cancelled = new AbortController();
  cancelled.abort();
  expect(await runCompiler(source, cancelled.signal)).toMatchObject({
    ok: false,
    error: { message: expect.stringContaining('cancelled') },
  });
}, 30000);
