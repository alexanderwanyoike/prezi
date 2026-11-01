import { cp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSite } from './site-release';
import { failure } from '../src/shared/result';
import type { Result } from '../src/shared/result';

export async function buildSite(release: unknown, directory: string): Promise<Result<void>> {
  try {
    const html = renderSite(await readFile(resolve('site/index.html'), 'utf8'), release);
    if (!html.ok) return html;
    await mkdir(directory, { recursive: true });
    await cp(resolve('site/assets'), join(directory, 'assets'), { recursive: true });
    await cp(resolve('site/styles.css'), join(directory, 'styles.css'));
    await writeFile(join(directory, 'index.html'), html.value);
    return { ok: true, value: undefined };
  } catch {
    return failure('IO_ERROR', 'The download site could not be built.');
  }
}
async function main(): Promise<Result<void>> {
  const [release, directory, ...extra] = process.argv.slice(2);
  if (!release || !directory || extra.length)
    return failure(
      'INVALID_INPUT',
      'Usage: yarn site:build <published-release.json> <output-directory>',
    );
  try {
    const input: unknown = JSON.parse(await readFile(release, 'utf8'));
    return await buildSite(input, directory);
  } catch {
    return failure('IO_ERROR', 'The published release metadata could not be read.');
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await main();
  if (!result.ok) {
    process.stderr.write(`${result.error.message}\n`);
    process.exitCode = 1;
  }
}
