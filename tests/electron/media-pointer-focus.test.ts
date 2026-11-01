import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { fileCommand } from './file-command';

([false, true] as const).forEach((custom) => {
  test(`returns pointer media focus to presentation navigation (${custom ? 'custom' : 'built-in'})`, async () => {
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
      await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
      await desktop.evaluate(
        ({ dialog }, path) =>
          Object.assign(dialog, {
            showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
            showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
          }),
        resolve('tests/fixtures/held-video.webm'),
      );
      await fileCommand(page, 'importMedia');
      await page.getByLabel('Autoplay video', { exact: true }).uncheck();
      if (custom) {
        await page.getByRole('tab', { name: 'Code', exact: true }).click();
        await page.getByRole('button', { name: 'Create custom scene', exact: true }).click();
        await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
        await expect
          .poll(
            async () => {
              const state = await page.evaluate(() => window.prezi.snapshot());
              return state.ok ? Boolean(state.value.project.slides[0]?.scene) : false;
            },
            { timeout: 15000 },
          )
          .toBe(true);
        await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      const stage = page.getByRole('region', { name: 'Presentation stage' });
      await expect(stage).toHaveAttribute('data-busy', 'false');
      const content = custom ? page.frameLocator('iframe[title="Custom scene"]') : stage;
      const video = content.locator('video');
      await video.hover();
      await content.getByRole('button', { name: 'Play video', exact: true }).click();
      await expect
        .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
        .toBe(false);
      await page.keyboard.press('ArrowRight');
      await expect(stage).toHaveAttribute('data-slide', '2');
      await expect(stage).toHaveAttribute('data-busy', 'false');
      await page.keyboard.press('Escape');
    } finally {
      await desktop.close();
    }
  });
});
