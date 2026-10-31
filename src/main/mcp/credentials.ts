import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function readToken(directory: string): Promise<Result<string>> {
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, 'mcp-token');
    try {
      const token = randomBytes(32).toString('hex');
      await writeFile(path, token, { flag: 'wx', mode: 0o600 });
      return { ok: true, value: token };
    } catch (error) {
      if (!z.object({ code: z.literal('EEXIST') }).safeParse(error).success) throw error;
    }
    const info = await stat(path);
    if (
      !info.isFile() ||
      info.size > 128 ||
      (process.platform !== 'win32' && info.mode % 0o100 !== 0)
    )
      return failure('IO_ERROR', 'The MCP token file must be private to your account.');
    const token = (await readFile(path, 'utf8')).trim();
    return /^[a-f0-9]{64}$/.test(token)
      ? { ok: true, value: token }
      : failure('IO_ERROR', 'The MCP token file is invalid.');
  } catch {
    return failure(
      'IO_ERROR',
      'MCP credentials could not be opened. The editor remains available.',
    );
  }
}
export async function writeConnection(
  directory: string,
  url: string,
  token: string,
): Promise<void> {
  const path = join(directory, 'mcp-connection.json');
  await writeFile(path, JSON.stringify({ url, token }), { mode: 0o600 });
  if (process.platform !== 'win32') await chmod(path, 0o600);
}
