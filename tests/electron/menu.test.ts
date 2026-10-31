import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('uses application menus, desktop shortcuts and Canvas/Code workspace tabs', async () => {
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
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
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, test.info().outputPath('menu-deck.prezi'));
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { name: 'Your presentation desk' })).toBeVisible();
    await expect(
      page.getByRole('banner').getByRole('button', { name: 'Save', exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .fill('An application workspace');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await page.keyboard.press('Control+2');
    await expect(page.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('textbox', { name: 'Scene source code' })).toBeVisible();
    await page.getByRole('tab', { name: 'Code', exact: true }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Canvas', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Canvas', exact: true }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Code', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Code', exact: true }).press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Canvas', exact: true })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Canvas heading' })).toHaveText(
      'An application workspace',
    );
    await page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'New presentation', exact: true }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Untitled slide');
    await page.keyboard.press('Control+o');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
      'An application workspace',
    );
    await page
      .getByRole('menubar')
      .getByRole('menuitem', { name: 'File', exact: true })
      .press('ArrowDown');
    await expect(
      page.getByRole('menuitem', { name: 'New presentation', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'File' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    const source = page.getByRole('textbox', { name: 'Scene source code', exact: true });
    await source.focus();
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Edit', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Select all', exact: true }).click();
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Edit', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();
    const expectedSource = await readFile(
      resolve('src/renderer/presentation/SlideScene.tsx'),
      'utf8',
    );
    await expect
      .poll(() => desktop.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe(expectedSource);
    await source.press('ArrowRight');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await expect
      .poll(() => desktop.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe(expectedSource);
  } finally {
    await desktop.close();
  }
});
