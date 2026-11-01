import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { verifyRelease } from './verify-release';

test('checks installer metadata against actual bytes before publishing release checksums', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-release-set-'));
  const version = '0.1.0';
  const names = [
    `Prezi-${version}-linux-x64.AppImage`,
    `Prezi-${version}-windows-x64-setup.exe`,
    `Prezi-${version}-macos-arm64.dmg`,
    `Prezi-${version}-macos-x64.dmg`,
    `Prezi-${version}-windows-x64-setup.exe.blockmap`,
  ];
  try {
    await Promise.all(names.map((name) => writeFile(join(directory, name), `fixture ${name}`)));
    await Promise.all(
      [
        ['latest-linux.yml', names[0]],
        ['latest.yml', names[1]],
      ].map(async ([manifest, name]) => {
        if (!manifest || !name) throw new Error('Missing fixture');
        const bytes = await readFile(join(directory, name));
        await writeFile(
          join(directory, manifest),
          `version: ${version}\nfiles:\n  - url: ${name}\n    sha512: ${createHash('sha512').update(bytes).digest('base64')}\n    size: ${bytes.length.toString()}\n`,
        );
      }),
    );
    expect((await verifyRelease(directory, version)).ok).toBe(true);
    const command = promisify(execFile);
    const executed = await command(process.execPath, [
      '--experimental-strip-types',
      resolve('scripts/verify-release.ts'),
      directory,
      version,
    ]);
    expect(executed.stdout).toContain('Validated 7 release files.');
    const sums = await readFile(join(directory, 'SHA256SUMS'), 'utf8');
    expect(sums).toContain(names[0]);
    expect(sums.trim().split('\n')).toHaveLength(7);
    const windows = names[1];
    if (!windows) throw new Error('Missing installer');
    await writeFile(join(directory, windows), 'corrupt installer');
    expect((await verifyRelease(directory, version)).ok).toBe(false);
    expect(await readFile(join(directory, 'SHA256SUMS'), 'utf8')).toBe(sums);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
