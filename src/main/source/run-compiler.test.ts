import { expect, it } from 'vitest';
import { mkdtemp, copyFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runCompiler } from './run-compiler';

it('passes property declarations into the real isolated compiler', async () => {
  const result = await runCompiler(
    {
      entry: 'Scene.tsx',
      files: {
        'Scene.tsx': `import type {SceneProps} from 'prezi'; export default function Scene({props}:SceneProps){return <div style={{fontSize:props.size}}>Editable</div>;}`,
      },
    },
    new AbortController().signal,
    undefined,
    { size: { type: 'number', label: 'Size', default: 80 } },
  );
  expect(result.ok).toBe(true);
}, 30000);

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
  expect(cancelledResult.error.code).toBe('CANCELLED');
}, 30000);

it('cancels a running compiler and returns its resource boundary', async () => {
  const source = {
    entry: 'Scene.tsx',
    files: { 'Scene.tsx': 'export default function Scene() { return <div/>; }' },
  };
  const controller = new AbortController();
  const running = runCompiler(source, controller.signal);
  const timer = setTimeout(() => {
    controller.abort();
  }, 100);
  const result = await running;
  clearTimeout(timer);
  expect(result.ok).toBe(false);
  if (result.ok) throw Error('Expected a cancelled worker');
  expect(result.error.message).toContain('cancelled');
  expect(result.error.code).toBe('CANCELLED');
});

it('reports a missing worker as an environment failure', async () => {
  const result = await runCompiler(
    { entry: 'Scene.tsx', files: { 'Scene.tsx': 'export default()=>null' } },
    new AbortController().signal,
    `/nonexistent/prezi-worker-${crypto.randomUUID()}`,
  );
  expect(result).toMatchObject({ ok: false, error: { code: 'IO_ERROR' } });
});

it('preserves an isolated worker environment failure after it starts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-worker-types-'));
  try {
    await copyFile(resolve('out/compiler/worker.cjs'), join(directory, 'worker.cjs'));
    await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'junction');
    const result = await runCompiler(
      { entry: 'Scene.tsx', files: { 'Scene.tsx': 'export default()=>null' } },
      new AbortController().signal,
      directory,
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'IO_ERROR' } });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
