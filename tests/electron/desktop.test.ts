import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('opens the isolated desktop with an editor ready for a local presentation', async () => {
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
    await expect(page.getByRole('heading', { name: 'Your presentation desk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeVisible({
      timeout: 1500,
    });
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    await page.getByRole('button', { name: 'Sage', exact: true }).click();
    await page.getByRole('button', { name: 'Paper', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'sage');
    await expect(page.getByRole('complementary', { name: 'Slides' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Slide properties' })).toBeVisible();
    expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
  } finally {
    await desktop.close();
  }
});
