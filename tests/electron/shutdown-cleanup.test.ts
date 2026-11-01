import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileCommand } from './file-command';

test('removes imported and extracted resources before normal application quit completes', async () => {
  const temporary = test.info().outputPath('temp');
  await mkdir(temporary, { recursive: true });
  const fixture = test.info().outputPath('image.png');
  const saved = test.info().outputPath('deck.prezi');
  await writeFile(
    fixture,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      TMPDIR: temporary,
      TMP: temporary,
      TEMP: temporary,
      PREZI_MCP_PORT: '0',
    },
  });
  let closed = false;
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    await desktop.evaluate(
      ({ dialog }, paths) =>
        Object.assign(dialog, {
          showOpenDialog: (_window: unknown, options: { title?: string }) =>
            Promise.resolve({
              canceled: false,
              filePaths: [options.title === 'Import media' ? paths.fixture : paths.saved],
            }),
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: paths.saved }),
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        }),
      { fixture, saved },
    );
    await fileCommand(page, 'importMedia');
    await expect(page.getByRole('button', { name: 'Remove media', exact: true })).toBeVisible();
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await fileCommand(page, 'open');
    await expect
      .poll(() => page.evaluate(() => window.prezi.snapshot()))
      .toMatchObject({ ok: true, value: { revision: 2 } });
    await expect(page.getByRole('button', { name: 'Remove media', exact: true })).toBeVisible();
    const directories = (await readdir(temporary))
      .filter((name) => name.startsWith('prezi-imports-') || name.startsWith('prezi-project-'))
      .map((name) => join(temporary, name));
    expect(directories).toHaveLength(2);
    await desktop.close();
    closed = true;
    await expect
      .poll(() =>
        Promise.all(
          directories.map((path) =>
            access(path).then(
              () => true,
              () => false,
            ),
          ),
        ),
      )
      .toEqual([false, false]);
  } finally {
    if (!closed) await desktop.close();
  }
});
