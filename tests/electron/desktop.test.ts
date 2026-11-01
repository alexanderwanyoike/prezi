import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';

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
    await openExample(desktop);
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
    const title = page.getByLabel('Heading', { exact: true });
    await expect(title).toBeEditable({ timeout: 1500 });
    await title.fill('A working presentation');
    await title.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Slide 1: A working presentation', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Slide 2: A working presentation', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Move slide down', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Slide 3: A working presentation', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Delete slide', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Slide 3: A working presentation', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Add slide', exact: true }).click();
    await expect(title).toHaveValue('');
    await title.fill('An edit still in focus');
    await expect
      .poll(
        async () => {
          const current = await page.evaluate(() => window.prezi.snapshot());
          return current.ok
            ? current.value.project.slides.find((slide) => slide.title === 'An edit still in focus')
                ?.title
            : null;
        },
        { timeout: 1000 },
      )
      .toBe('An edit still in focus');
    expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
  } finally {
    await desktop.evaluate(({ dialog }) => {
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    });
    await desktop.close();
  }
});
