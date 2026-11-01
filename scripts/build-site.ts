import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Result } from '../src/shared/result';

export async function buildSite(_release: unknown, directory: string): Promise<Result<void>> {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'index.html'),
    await readFile(new URL('../site/index.html', import.meta.url)),
  );
  return { ok: true, value: undefined };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [release, directory] = process.argv.slice(2);
  if (!release || !directory) process.exitCode = 1;
  else {
    const input: unknown = JSON.parse(await readFile(release, 'utf8'));
    const result = await buildSite(input, directory);
    if (!result.ok) process.exitCode = 1;
  }
}
