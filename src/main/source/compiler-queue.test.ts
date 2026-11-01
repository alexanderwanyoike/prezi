import { expect, it } from 'vitest';
import type { Compilation, SceneSource } from '../../shared/custom-scene';
import { WorkQueue } from './work-queue';

it('runs one compiler at a time and removes a cancelled queued job', async () => {
  const started: string[] = [];
  let finishFirst: (result: Compilation) => void = () => {
    throw Error('Compiler did not start');
  };
  const queue = new WorkQueue<SceneSource, Compilation>(
    (source) => {
      started.push(source.entry);
      return source.entry === 'first.tsx'
        ? new Promise((resolve) => {
            finishFirst = resolve;
          })
        : Promise.resolve({ ok: true, value: { code: source.entry } });
    },
    (message) => ({ ok: false, error: { code: 'INVALID_INPUT', message, diagnostics: [] } }),
  );
  const first = queue.enqueue({ entry: 'first.tsx', files: {} }, new AbortController().signal);
  const controller = new AbortController();
  const second = queue.enqueue({ entry: 'second.tsx', files: {} }, controller.signal);
  expect(started).toEqual(['first.tsx']);
  controller.abort();
  expect(await second).toMatchObject({ ok: false });
  finishFirst({ ok: true, value: { code: 'first' } });
  expect((await first).ok).toBe(true);
  expect(
    (await queue.enqueue({ entry: 'third.tsx', files: {} }, new AbortController().signal)).ok,
  ).toBe(true);
  expect(started).toEqual(['first.tsx', 'third.tsx']);
});
