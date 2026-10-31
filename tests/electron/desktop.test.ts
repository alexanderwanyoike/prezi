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
    expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
  } finally {
    await desktop.close();
  }
});
