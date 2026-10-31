import { expect, it } from 'vitest';
import type { Compilation } from '../../shared/custom-scene';
import { CompilerQueue } from './compiler-queue';

it('runs one compiler at a time and removes a cancelled queued job', async () => {
  const started: string[] = [];
  let finishFirst: (result: Compilation) => void = () => {
    throw Error('Compiler did not start');
  };
  const queue = new CompilerQueue((source) => {
    started.push(source.entry);
    return source.entry === 'first.tsx'
      ? new Promise((resolve) => {
          finishFirst = resolve;
        })
      : Promise.resolve({ ok: true, value: { code: source.entry } });
  });
  const first = queue.compile({ entry: 'first.tsx', files: {} }, new AbortController().signal);
  const controller = new AbortController();
  const second = queue.compile({ entry: 'second.tsx', files: {} }, controller.signal);
  expect(started).toEqual(['first.tsx']);
  controller.abort();
  expect(await second).toMatchObject({ ok: false });
  finishFirst({ ok: true, value: { code: 'first' } });
  expect((await first).ok).toBe(true);
  expect(
    (await queue.compile({ entry: 'third.tsx', files: {} }, new AbortController().signal)).ok,
  ).toBe(true);
  expect(started).toEqual(['first.tsx', 'third.tsx']);
});
