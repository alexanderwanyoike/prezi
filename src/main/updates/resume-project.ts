import { open, readFile, rename, rm, stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { z } from 'zod';
import type { Result } from '../../shared/result';
import { failure } from '../../shared/result';

const resumeSchema = z.object({ path: z.string().max(4096).refine(isAbsolute) });
export async function rememberResume(
  directory: string,
  path: string | null,
): Promise<Result<void>> {
  const target = join(directory, 'update-resume.json');
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  if (path !== null && !resumeSchema.safeParse({ path }).success)
    return failure('INVALID_INPUT', 'The saved project path is invalid.');
  try {
    if (path === null) {
      await rm(target, { force: true });
      return { ok: true, value: undefined };
    }
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(JSON.stringify({ path }));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, target);
    return { ok: true, value: undefined };
  } catch {
    return failure('IO_ERROR', 'The saved deck could not be remembered for restart.');
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
export async function consumeResume(directory: string): Promise<Result<string | null>> {
  const target = join(directory, 'update-resume.json');
  try {
    const info = await stat(target);
    if (!info.isFile() || info.size > 8192)
      return failure('INVALID_INPUT', 'The update resume file is invalid.');
    const input: unknown = JSON.parse(await readFile(target, 'utf8'));
    const parsed = resumeSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'The update resume file is invalid.');
    await rm(target);
    return { ok: true, value: parsed.data.path };
  } catch (error) {
    return z.object({ code: z.literal('ENOENT') }).safeParse(error).success
      ? { ok: true, value: null }
      : failure('IO_ERROR', 'The saved deck could not be read after restart.');
  }
}
