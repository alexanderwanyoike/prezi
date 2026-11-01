import { expect, it } from 'vitest';
import { chmod, mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { AssetStore } from './asset-store';

it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
  'finishes independent deletions before reporting a cleanup failure',
  async () => {
    const store = new AssetStore();
    const directory = await mkdtemp(join(tmpdir(), 'prezi-dispose-'));
    let root: string | undefined;
    let blocked: string | undefined;
    try {
      const image = join(directory, 'image.png');
      await writeFile(
        image,
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
          'base64',
        ),
      );
      const imported = await store.import(image);
      if (!imported.ok) throw Error(imported.error.message);
      const managed = store.path(imported.value.id);
      if (!managed) throw Error('No managed image');
      root = dirname(managed);
      const healthy = root;
      await Promise.all(
        Array.from({ length: 100 }, (_, index) =>
          writeFile(join(healthy, index.toString()), 'fixture'),
        ),
      );
      blocked = await mkdtemp(join(directory, 'blocked-'));
      await writeFile(join(blocked, 'resource'), 'fixture');
      store.adopt(blocked, []);
      await chmod(blocked, 0o000);
      const result = await store.dispose();
      expect(result).toMatchObject({ ok: false, error: { code: 'IO_ERROR' } });
      expect(
        await access(healthy).then(
          () => true,
          () => false,
        ),
      ).toBe(false);
      await chmod(blocked, 0o700);
    } finally {
      if (blocked) await chmod(blocked, 0o700);
      if (root) await rm(root, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
  },
);
