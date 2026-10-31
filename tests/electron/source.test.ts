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
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Code', exact: true }).click({ timeout: 1500 });
    const code = page.getByRole('textbox', { name: 'Scene source code', exact: true });
    await expect(code).toContainText('useCurrentFrame');
    await expect(code).toHaveAttribute('aria-readonly', 'true');
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
  } finally {
    await desktop.evaluate(({ dialog }) => {
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    });
    await desktop.close();
  }
});
