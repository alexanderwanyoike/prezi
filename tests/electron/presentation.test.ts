import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('presents manual reveals without repeated-key skipping or automatic progression', async () => {
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
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeEnabled({
      timeout: 1500,
    });
    const body = page.getByLabel('Body', { exact: true });
    await body.focus();
    await body.press('Space');
    await expect(page.getByRole('region', { name: 'Presentation stage' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.press('Space');
    await expect(stage).toHaveAttribute('data-slide', '2');
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-reveal', '0');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.down('Space');
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await expect(
      stage.getByText('Planning / find the smallest useful idea', { exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(700);
    await expect(stage).toHaveAttribute('data-slide', '2');
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-reveal', '0');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await expect
      .poll(() =>
        desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isFullScreen()),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary', { name: 'Slides' })).toBeVisible();
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect(stage).toHaveAttribute('data-reveal', '0');
    await page.keyboard.press('Escape');
  } finally {
    await desktop.evaluate(({ dialog }) => {
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    });
    await desktop.close();
  }
});
