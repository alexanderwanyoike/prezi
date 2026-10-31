import { expect, test } from 'vitest';
import { createUpdateService } from './service';
import type { Result } from '../../shared/result';

test('downloads explicitly, reports progress and only installs after save protection succeeds', async () => {
  let finish: ((result: Result<void>) => void) | undefined;
  let installed = 0;
  let releaseCount = 0;
  const updates = createUpdateService({
    automatic: true,
    check: () => Promise.resolve({ ok: true, value: '0.2.0' }),
    download: (_version, progress) => {
      progress(42.2);
      return new Promise<Result<void>>((resolve) => {
        finish = resolve;
      });
    },
    install: () => {
      installed += 1;
      return Promise.resolve({
        ok: false,
        error: { code: 'IO_ERROR', message: 'Installer failed' },
      });
    },
  });
  expect(
    (await updates.install(() => Promise.resolve({ ok: true, value: () => undefined }))).ok,
  ).toBe(false);
  expect(await updates.check()).toMatchObject({
    ok: true,
    value: { stage: 'available', version: '0.2.0', automatic: true },
  });
  expect(installed).toBe(0);
  const downloading = updates.download();
  expect(updates.status()).toMatchObject({ stage: 'downloading', percent: 42 });
  expect((await updates.download()).ok).toBe(false);
  if (!finish) throw new Error('Missing download');
  finish({ ok: true, value: undefined });
  expect(await downloading).toMatchObject({
    ok: true,
    value: { stage: 'ready', version: '0.2.0' },
  });
  expect(
    (
      await updates.install(() =>
        Promise.resolve({ ok: false, error: { code: 'CANCELLED', message: 'Keep working' } }),
      )
    ).ok,
  ).toBe(false);
  expect(installed).toBe(0);
  expect(
    (
      await updates.install(() =>
        Promise.resolve({
          ok: true,
          value: () => {
            releaseCount += 1;
          },
        }),
      )
    ).ok,
  ).toBe(false);
  expect(installed).toBe(1);
  expect(releaseCount).toBe(1);
  expect(updates.status()).toMatchObject({ stage: 'ready', version: '0.2.0' });
});

test('reports a completed check with no newer release distinctly from the unchecked state', async () => {
  const updates = createUpdateService({
    automatic: true,
    check: () => Promise.resolve({ ok: true, value: null }),
    download: () => Promise.resolve({ ok: true, value: undefined }),
    install: () => Promise.resolve({ ok: true, value: undefined }),
  });
  expect(updates.status()).toMatchObject({ stage: 'idle' });
  expect(await updates.check()).toMatchObject({ ok: true, value: { stage: 'current' } });
});
