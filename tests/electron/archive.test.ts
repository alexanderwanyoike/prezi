import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileCommand } from './file-command';

test('defaults to a portable prezi file and reopens its edited content', async () => {
  const path = test.info().outputPath('portable.prezi');
  const desktop = await electron.launch({
    args: [resolve('.'), `--user-data-dir=${test.info().outputPath('profile')}`],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
  });
  try {
    await desktop.evaluate(({ dialog, BrowserWindow }, filePath) => {
      Object.assign(dialog, {
        showSaveDialog: (_parent: unknown, options: Electron.SaveDialogOptions) => {
          const window = BrowserWindow.getAllWindows()[0];
          if (!window) throw new Error('Missing editor window');
          Object.assign(window, { savedDialogOptions: options });
          return Promise.resolve({ canceled: false, filePath });
        },
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [filePath] }),
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, path);
    const page = await desktop.firstWindow();
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .fill('A portable explanation');
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    const options: unknown = await desktop.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('Missing editor window');
      const captured: unknown = Reflect.get(window, 'savedDialogOptions');
      return captured;
    });
    expect(options).toMatchObject({
      defaultPath: expect.stringMatching(/\.prezi$/),
      filters: expect.arrayContaining([{ name: 'Prezi project', extensions: ['prezi'] }]),
    });
    expect((await readFile(path)).subarray(0, 2).toString()).toBe('PK');
    await fileCommand(page, 'newProject');
    await fileCommand(page, 'open');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('A portable explanation');
  } finally {
    await desktop.close();
  }
});
