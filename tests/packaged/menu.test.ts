import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

test('registers the Linux AppImage on its first packaged launch', async () => {
  test.skip(process.platform !== 'linux', 'Only Linux AppImages register an XDG menu entry.');
  const input: unknown = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const { version } = z.object({ version: z.string() }).parse(input);
  const appImage = resolve(`release/Prezi-${version}-linux-x64.AppImage`);
  const dataHome = test.info().outputPath('data');
  const desktop = await electron.launch({
    executablePath:
      process.env.PREZI_PACKAGED_EXECUTABLE ?? resolve('release/linux-unpacked/prezi'),
    args: ['--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      PREZI_MCP_PORT: '0',
      APPIMAGE: appImage,
      XDG_DATA_HOME: dataHome,
    },
  });
  try {
    await desktop.firstWindow();
    expect(await desktop.evaluate(({ app }) => app.isPackaged)).toBe(true);
    const entry = await readFile(
      resolve(dataHome, 'applications/io.github.alexanderwanyoike.prezi.desktop'),
      'utf8',
    );
    expect(entry).toContain(`Exec=env -- "${appImage}"`);
    expect(entry).toContain('Name=Prezi\n');
    expect(
      await readFile(resolve(dataHome, 'icons/io.github.alexanderwanyoike.prezi.png')),
    ).toEqual(await readFile(resolve('resources/icons/icon.png')));
  } finally {
    await desktop.close();
  }
});
