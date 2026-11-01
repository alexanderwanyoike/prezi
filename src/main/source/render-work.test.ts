import { expect, it } from 'vitest';
import { WorkQueue } from './work-queue';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

it('serializes trusted render tasks and drops queued cancelled work without starting it', async () => {
  const started: string[] = [];
  let finish: (value: Result<void>) => void = () => undefined;
  const queue = new WorkQueue<() => Promise<Result<void>>, Result<void>>(
    (run) => run(),
    (message) => failure('CANCELLED', message),
    (run) => run,
  );
  const first = queue.enqueue(() => {
    started.push('compile');
    return new Promise((resolve) => {
      finish = resolve;
    });
  }, new AbortController().signal);
  const cancelled = new AbortController();
  const second = queue.enqueue(() => {
    started.push('cancelled-preview');
    return Promise.resolve({ ok: true, value: undefined });
  }, cancelled.signal);
  const third = queue.enqueue(() => {
    started.push('preview');
    return Promise.resolve({ ok: true, value: undefined });
  }, new AbortController().signal);
  expect(started).toEqual(['compile']);
  cancelled.abort();
  expect(await second).toMatchObject({ ok: false, error: { code: 'CANCELLED' } });
  finish({ ok: true, value: undefined });
  expect(await first).toMatchObject({ ok: true });
  expect(await third).toMatchObject({ ok: true });
  expect(started).toEqual(['compile', 'preview']);
});

it('reports queue saturation as a conflict rather than a cancellation', async () => {
  const { RenderWork } = await import('./render-work');
  const work = new RenderWork();
  let finish: () => void = () => undefined;
  const first = work.run(
    () =>
      new Promise<Result<void>>((resolve) => {
        finish = () => resolve({ ok: true, value: undefined });
      }),
    new AbortController().signal,
  );
  const pending = Array.from({ length: 3 }, () =>
    work.run(async () => ({ ok: true, value: undefined }), new AbortController().signal),
  );
  const rejected = await work.run(
    async () => ({ ok: true, value: undefined }),
    new AbortController().signal,
  );
  finish();
  await Promise.all([first, ...pending]);
  expect(rejected).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
});
