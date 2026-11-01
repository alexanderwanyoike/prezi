import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import semver from 'semver';
import { z } from 'zod';
import type { Result } from '../src/shared/result';

interface Digest {
  name: string;
  sha256: string;
  sha512: string;
  size: number;
}
function invalid(message: string): Result<never> {
  return { ok: false, error: { code: 'INVALID_INPUT', message } };
}
async function digest(directory: string, name: string): Promise<Result<Digest>> {
  const path = join(directory, name);
  const info = await lstat(path);
  if (!info.isFile() || info.size === 0) return invalid(`Missing or invalid release file: ${name}`);
  const sha256 = createHash('sha256');
  const sha512 = createHash('sha512');
  const stream = createReadStream(path);
  return new Promise((resolveDigest) => {
    stream.on('data', (chunk: string | Buffer) => {
      sha256.update(chunk);
      sha512.update(chunk);
    });
    stream.once('error', () => {
      resolveDigest({ ok: false, error: { code: 'IO_ERROR', message: `Could not hash ${name}` } });
    });
    stream.once('end', () => {
      resolveDigest({
        ok: true,
        value: {
          name,
          size: info.size,
          sha256: sha256.digest('hex'),
          sha512: sha512.digest('base64'),
        },
      });
    });
  });
}
const metadataSchema = z.object({
  version: z.string(),
  files: z.tuple([
    z.object({ url: z.string(), sha512: z.string(), size: z.number().int().positive() }),
  ]),
  path: z.string().optional(),
  sha512: z.string().optional(),
});
export async function verifyRelease(
  directory: string,
  version: string,
): Promise<Result<{ files: string[] }>> {
  if (!semver.valid(version) || semver.prerelease(version))
    return invalid('A stable release version is required.');
  const linux = `Prezi-${version}-linux-x64.AppImage`;
  const windows = `Prezi-${version}-windows-x64-setup.exe`;
  const names = [
    linux,
    windows,
    `Prezi-${version}-macos-arm64.dmg`,
    `Prezi-${version}-macos-x64.dmg`,
    `${windows}.blockmap`,
    'latest-linux.yml',
    'latest.yml',
  ].sort();
  const temporary = join(directory, `.checksums-${randomUUID()}.tmp`);
  try {
    const entries = await readdir(directory);
    if (
      entries.some((name) => name !== 'SHA256SUMS' && !names.includes(name)) ||
      names.some((name) => !entries.includes(name))
    )
      return invalid(
        'The release set must contain every platform installer, update manifest and Windows blockmap, with no unrelated files.',
      );
    const checked = await names.reduce<Promise<Result<Digest[]>>>(
      async (previous, name) => {
        const result = await previous;
        if (!result.ok) return result;
        const file = await digest(directory, name);
        return file.ok ? { ok: true, value: [...result.value, file.value] } : file;
      },
      Promise.resolve({ ok: true, value: [] }),
    );
    if (!checked.ok) return checked;
    const byName = new Map(checked.value.map((file) => [file.name, file]));
    const manifests = await Promise.all(
      [
        ['latest-linux.yml', linux],
        ['latest.yml', windows],
      ].map(async ([manifest, name]): Promise<Result<void>> => {
        if (!manifest || !name) return invalid('Missing update manifest.');
        const file = byName.get(name);
        const metadataFile = byName.get(manifest);
        if (!file || !metadataFile || metadataFile.size > 65536)
          return invalid(`Invalid update metadata: ${manifest}`);
        const input: unknown = load(await readFile(join(directory, manifest), 'utf8'));
        const parsed = metadataSchema.safeParse(input);
        if (!parsed.success) return invalid(`Invalid update metadata: ${manifest}`);
        const metadata = parsed.data;
        const entry = metadata.files[0];
        if (
          metadata.version !== version ||
          entry.url !== name ||
          entry.size !== file.size ||
          entry.sha512 !== file.sha512 ||
          (metadata.path !== undefined && metadata.path !== name) ||
          (metadata.sha512 !== undefined && metadata.sha512 !== file.sha512)
        )
          return invalid(`Update metadata does not match the installer bytes: ${manifest}`);
        return { ok: true, value: undefined };
      }),
    );
    const failed = manifests.find((result) => !result.ok);
    if (failed) return failed;
    await writeFile(
      temporary,
      checked.value.map((file) => `${file.sha256}  ${file.name}\n`).join(''),
    );
    await rename(temporary, join(directory, 'SHA256SUMS'));
    return { ok: true, value: { files: names } };
  } catch {
    return {
      ok: false,
      error: {
        code: 'IO_ERROR',
        message: 'The release set could not be validated. Check its files and permissions.',
      },
    };
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [directory, version] = process.argv.slice(2);
  const result =
    directory && version && process.argv.length === 4
      ? await verifyRelease(resolve(directory), version)
      : invalid('Usage: yarn release:verify <release directory> <version>');
  if (result.ok)
    process.stdout.write(`Validated ${result.value.files.length.toString()} release files.\n`);
  else {
    process.stderr.write(`${result.error.message}\n`);
    process.exitCode = 1;
  }
}
