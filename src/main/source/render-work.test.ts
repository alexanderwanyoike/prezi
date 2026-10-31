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
