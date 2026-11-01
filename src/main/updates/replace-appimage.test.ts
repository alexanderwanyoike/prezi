import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { replaceAppImage } from './replace-appimage';

test('replaces a verified AppImage atomically and retains the old executable after a failed update', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-update-'));
  const current = join(directory, 'Prezi.AppImage');
  const downloaded = join(directory, 'verified.AppImage');
  try {
    await writeFile(current, 'old executable');
    await chmod(current, 0o751);
    expect((await replaceAppImage(current, downloaded)).ok).toBe(false);
    expect(await readFile(current, 'utf8')).toBe('old executable');
    await writeFile(downloaded, 'verified new executable');
    expect(await replaceAppImage(current, downloaded)).toMatchObject({ ok: true });
    expect(await readFile(current, 'utf8')).toBe('verified new executable');
    if (process.platform !== 'win32') expect((await stat(current)).mode % 0o1000).toBe(0o751);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
