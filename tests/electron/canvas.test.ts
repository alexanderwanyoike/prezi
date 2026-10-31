import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('edits scene text on the canvas through the same properties and undo history', async () => {
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
    const heading = page.getByRole('textbox', { name: 'Canvas heading', exact: true });
    await expect(heading).toBeEditable({ timeout: 2000 });
    await heading.fill('Written on the stage');
    await heading.press('End');
    await heading.pressSequentially(' itself');
    await expect(heading).toBeFocused();
    await expect(heading).toHaveText('Written on the stage itself');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
      'Written on the stage itself',
    );
    const body = page.getByRole('textbox', { name: 'Canvas body', exact: true });
    await body.fill('First thought\nSecond thought');
    await body.press('Tab');
    await expect(page.getByLabel('Body', { exact: true })).toHaveValue(
      'First thought\nSecond thought',
    );
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(body).toHaveText('A small idea. A working application.\nThe steps in between.');
    await page.getByLabel('Heading', { exact: true }).fill('Changed through properties');
    await page.getByLabel('Heading', { exact: true }).press('Tab');
    await expect(heading).toHaveText('Changed through properties');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Changed through properties', exact: true }),
    ).toBeVisible();
    await expect(page.locator('[contenteditable="plaintext-only"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await body.fill('');
    await body.press('Tab');
    await expect(page.getByLabel('Body', { exact: true })).toHaveValue('');
    const headingPosition = async (): Promise<number> => {
      await expect
        .poll(() =>
          page
            .locator('.slide-scene h2')
            .evaluate((node) =>
              node.parentElement ? getComputedStyle(node.parentElement).opacity : null,
            ),
        )
        .toBe('1');
      return page.locator('.slide-scene h2').evaluate((node) => {
        const scene = node.closest('.slide-scene')?.getBoundingClientRect();
        if (!scene) throw new Error('The scene is missing');
        return (node.getBoundingClientRect().top - scene.top) / scene.height;
      });
    };
    const editorPosition = await headingPosition();
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect.poll(headingPosition).toBeCloseTo(editorPosition, 3);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Add slide', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Canvas body', exact: true })
      .fill('An empty layer becomes useful');
    await expect(page.getByLabel('Body', { exact: true })).toHaveValue(
      'An empty layer becomes useful',
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
