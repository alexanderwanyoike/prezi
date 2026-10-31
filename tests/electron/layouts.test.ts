import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('previews manually revealed process stages, edits a code layout and plays the bundled example video', async () => {
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      PREZI_MCP_PORT: '0',
    },
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: /^Slide 2:/ }).click();
    const diagram = page.getByRole('group', { name: 'Workflow diagram' });
    await expect(diagram.locator('[data-process-stage]')).toHaveCount(0);
    await page.getByRole('button', { name: '01 Planning', exact: true }).click();
    await expect(diagram.locator('[data-process-stage]')).toHaveCount(1);
    await expect(diagram.locator('[data-process-stage="0"]')).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: '04 Human testing', exact: true }).click();
    await expect(diagram.locator('[data-process-stage]')).toHaveCount(4);
    await expect(diagram.locator('[data-process-arrow]')).toHaveCount(3);
    await page.getByLabel('Layout', { exact: true }).selectOption('code');
    await page
      .getByLabel('Code block', { exact: true })
      .fill('const example = 42;\nconsole.log(example);');
    await expect(page.getByRole('textbox', { name: 'Canvas code', exact: true })).toContainText(
      'const example = 42;',
    );
    await page
      .getByRole('textbox', { name: 'Canvas code', exact: true })
      .fill('const editedOnCanvas = true;');
    await expect(page.getByLabel('Code block', { exact: true })).toHaveValue(
      'const editedOnCanvas = true;',
    );
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    const video = page.locator('video');
    await expect(video).toHaveJSProperty('readyState', 4);
    await page.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect.poll(() => video.evaluate((node) => node.currentTime)).toBeGreaterThan(0.1);
  } finally {
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    await desktop.close();
  }
});
