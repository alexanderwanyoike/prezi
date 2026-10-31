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
  const cancelledResult = await runCompiler(source, cancelled.signal);
  expect(cancelledResult.ok).toBe(false);
  if (cancelledResult.ok) throw Error('Expected cancellation');
  expect(cancelledResult.error.message).toContain('cancelled');
}, 30000);

it('cancels a running compiler and returns its resource boundary', async () => {
  const source = {
    entry: 'Scene.tsx',
    files: { 'Scene.tsx': 'export default function Scene() { return <div/>; }' },
  };
  const controller = new AbortController();
  const running = runCompiler(source, controller.signal);
  const timer = setTimeout(() => controller.abort(), 100);
  const result = await running;
  clearTimeout(timer);
  expect(result.ok).toBe(false);
  if (result.ok) throw Error('Expected a cancelled worker');
  expect(result.error.message).toContain('cancelled');
});
