import { constants } from 'node:fs';
import { chmod, copyFile, lstat, open, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function replaceAppImage(current: string, downloaded: string): Promise<Result<void>> {
  if (!isAbsolute(current) || !isAbsolute(downloaded) || current === downloaded)
    return failure('INVALID_INPUT', 'The AppImage update paths are invalid.');
  const staged = join(dirname(current), `.prezi-update-${crypto.randomUUID()}.AppImage`);
  try {
    const [original, update] = await Promise.all([lstat(current), lstat(downloaded)]);
    if (!original.isFile() || !update.isFile() || update.size === 0)
      return failure('INVALID_INPUT', 'The verified AppImage update is unavailable.');
    await copyFile(downloaded, staged, constants.COPYFILE_EXCL);
    await chmod(staged, original.mode % 0o1000);
    const file = await open(staged, 'r');
    try {
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(staged, current);
    return { ok: true, value: undefined };
  } catch {
    return failure(
      'IO_ERROR',
      'Could not replace the AppImage. Keep it in a writable folder and retry.',
    );
  } finally {
    await rm(staged, { force: true }).catch(() => undefined);
  }
}
