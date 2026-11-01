import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { fileCommand } from './file-command';

test('opens an empty project on a fresh launch and through New presentation', async () => {
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
    const page = await desktop.firstWindow();
    const name = page.getByRole('textbox', { name: 'Presentation name', exact: true });
    const heading = page.getByRole('textbox', { name: 'Canvas heading', exact: true });
    await expect(name).toHaveValue('Untitled presentation');
    await expect(heading).toHaveText('');
    await expect(page.getByRole('button', { name: /^Slide \d+:/ })).toHaveCount(1);
    await expect(page.locator('video')).toHaveCount(0);
    const thumbnail = page.getByRole('button', { name: /^Slide 1:/ }).locator('.thumbnail');
    await expect(thumbnail).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(thumbnail).toHaveCSS('color', 'rgb(23, 23, 23)');
    await expect(thumbnail.locator('.mini-rule')).toHaveCSS('background-color', 'rgb(64, 64, 64)');
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const previousHeading = await heading.elementHandle();
    await fileCommand(page, 'newProject');
    await expect
      .poll(async () => {
        const current = await page.evaluate(() => window.prezi.snapshot());
        return current.ok ? current.value.project.id : null;
      })
      .not.toBe(initial.value.project.id);
    await expect.poll(() => previousHeading.evaluate((element) => element.isConnected)).toBe(false);
    await expect(name).toHaveValue('Untitled presentation');
    await expect(heading).toHaveText('');
    await expect(page.getByRole('button', { name: /^Slide \d+:/ })).toHaveCount(1);
  } finally {
    await desktop.close();
  }
});
