import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileCommand } from './file-command';

test('creates, saves and reopens a deck through desktop commands without discarding failed imports', async () => {
  const filePath = test.info().outputPath('my-deck.prezi.json');
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
    await desktop.evaluate(({ dialog }, path) => {
      Object.assign(dialog, {
        showSaveDialog: () => Promise.resolve({ canceled: false, filePath: path }),
      });
      Object.assign(dialog, {
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
      });
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, filePath);
    const page = await desktop.firstWindow();
    await expect(
      page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }),
    ).toBeEnabled({
      timeout: 1500,
    });
    await fileCommand(page, 'newProject');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Untitled slide');
    await page.getByLabel('Presentation name', { exact: true }).fill('My local explanation');
    await page.getByLabel('Heading', { exact: true }).fill('An opening thought');
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toMatchObject({
      name: 'My local explanation',
      slides: [{ title: 'An opening thought' }],
    });
    await fileCommand(page, 'newProject');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Untitled slide');
    await fileCommand(page, 'open');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('An opening thought');
    await expect(page.getByLabel('Presentation name', { exact: true })).toHaveValue(
      'My local explanation',
    );
    await writeFile(filePath, '{invalid json', 'utf8');
    await fileCommand(page, 'open');
    await expect(page.getByRole('alert')).toContainText('Could not open');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('An opening thought');
  } finally {
    await desktop.close();
  }
});
