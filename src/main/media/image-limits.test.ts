import { mkdtemp, rm, writeFile, truncate } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from 'vitest';
import { AssetStore } from './asset-store';

test('rejects oversized image dimensions before registering a resource', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-image-limits-'));
  const store = new AssetStore();
  try {
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );
    bytes.writeUInt32BE(8193, 16);
    const path = join(directory, 'large.png');
    await writeFile(path, bytes);
    expect(await store.import(path)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', message: expect.stringContaining('8192') },
    });
  } finally {
    await store.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects image files over 32 MiB even when their dimensions are small', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-image-bytes-'));
  const store = new AssetStore();
  try {
    const path = join(directory, 'large.png');
    await writeFile(
      path,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    await truncate(path, 32 * 1024 * 1024 + 1);
    expect(await store.import(path)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', message: expect.stringContaining('32 MiB') },
    });
  } finally {
    await store.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
