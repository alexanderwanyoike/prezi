import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('inspects scene source and live instance properties without changing the deck', async () => {
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
    await desktop.evaluate(({ dialog }, filePath) => {
      Object.assign(dialog, {
        showSaveDialog: () => Promise.resolve({ canceled: false, filePath }),
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [filePath] }),
      });
    }, test.info().outputPath('source-deck.prezi'));
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Code', exact: true }).click({ timeout: 1500 });
    const code = page.getByRole('textbox', { name: 'Scene source code', exact: true });
    await expect(code).toContainText('useCurrentFrame');
    await expect(code).toHaveAttribute('aria-readonly', 'true');
    const firstLine = await page.locator('.cm-content .cm-line').first().boundingBox();
    const firstNumber = await page
      .locator('.cm-lineNumbers .cm-gutterElement')
      .filter({ hasText: /^1$/ })
      .boundingBox();
    if (!firstLine || !firstNumber) throw new Error('Missing source line or its number');
    expect(Math.abs(firstLine.y - firstNumber.y)).toBeLessThan(1);
    await page
      .getByRole('button', { name: 'renderer/presentation/SceneMedia.tsx', exact: true })
      .click();
    await expect(code).toContainText('mediaUrl');
    await page.getByRole('button', { name: 'Slide properties', exact: true }).click();
    await expect(code).toContainText('Vibez / how I built it');
    await page.getByLabel('Heading', { exact: true }).fill('Properties stay live');
    await expect(code).toContainText('Properties stay live');
    await page.getByRole('button', { name: 'Code', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
      'Properties stay live',
    );
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
      'Vibez / how I built it',
    );
    await page.getByRole('button', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New presentation', exact: true }).click();
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await page
      .getByRole('button', { name: 'renderer/presentation/SlideScene.tsx', exact: true })
      .click();
    await expect(code).toContainText('useCurrentFrame');
  } finally {
    await desktop.evaluate(({ dialog }) => {
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    });
    await desktop.close();
  }
});
