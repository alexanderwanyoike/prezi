import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { integrateAppImage } from './appimage-menu';

it('registers a packaged Linux AppImage and persistent icon in XDG user data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-menu-'));
  try {
    const appImage = join(directory, 'Prezi 0.1.0.AppImage');
    await writeFile(appImage, 'AppImage fixture', { mode: 0o755 });
    const options = {
      platform: 'linux' as const,
      packaged: true,
      appImage,
      home: directory,
      dataHome: join(directory, 'user data'),
      icon: resolve('resources/icons/icon.png'),
    };
    expect(await integrateAppImage(options)).toEqual({ ok: true, value: undefined });
    const entry = await readFile(
      join(options.dataHome, 'applications/io.github.alexanderwanyoike.prezi.desktop'),
      'utf8',
    );
    expect(entry).toContain(`Exec=env -- "${appImage}"`);
    expect(entry).toContain('Name=Prezi\n');
    expect(entry).toContain('StartupWMClass=prezi\n');
    expect(entry).not.toContain('/tmp/.mount_');
    const icon = join(options.dataHome, 'icons/io.github.alexanderwanyoike.prezi.png');
    expect(entry).toContain(`Icon=${icon}`);
    expect(await readFile(icon)).toEqual(await readFile(options.icon));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each([
  { platform: 'linux' as const, packaged: false, appImage: '/unused.AppImage' },
  { platform: 'linux' as const, packaged: true, appImage: undefined },
  { platform: 'darwin' as const, packaged: true, appImage: '/unused.AppImage' },
  { platform: 'win32' as const, packaged: true, appImage: '/unused.AppImage' },
])('leaves non-AppImage launches untouched: %j', async (runtime) => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-menu-skip-'));
  try {
    expect(
      await integrateAppImage({
        ...runtime,
        home: directory,
        icon: '/unused.png',
        dataHome: join(directory, 'data'),
      }),
    ).toEqual({ ok: true, value: undefined });
    expect(await readdir(directory)).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
