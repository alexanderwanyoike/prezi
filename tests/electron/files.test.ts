import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

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
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    }, filePath);
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled({
      timeout: 1500,
    });
    await page.getByRole('button', { name: 'New presentation', exact: true }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Untitled slide');
    await page.getByLabel('Presentation name', { exact: true }).fill('My local explanation');
    await page.getByLabel('Heading', { exact: true }).fill('An opening thought');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toMatchObject({
      name: 'My local explanation',
      slides: [{ title: 'An opening thought' }],
    });
    await page.getByRole('button', { name: 'New presentation', exact: true }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Untitled slide');
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('An opening thought');
    await expect(page.getByLabel('Presentation name', { exact: true })).toHaveValue(
      'My local explanation',
    );
    await writeFile(filePath, '{invalid json', 'utf8');
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Could not open');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('An opening thought');
  } finally {
    await desktop.close();
  }
});
