import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

(['Escape', 'Back to editor'] as const).forEach((action) => {
  test(`returns to the editor after fullscreen failure using ${action}`, async () => {
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
      await desktop.evaluate(({ ipcMain }) => {
        ipcMain.removeHandler('presentation:fullscreen');
        ipcMain.handle('presentation:fullscreen', () => ({
          ok: false,
          error: { code: 'IO_ERROR', message: 'Fullscreen could not be changed.' },
        }));
      });
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Presentation stage' })).toBeVisible();
      if (action === 'Escape') await page.keyboard.press('Escape');
      else await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
      await expect(page.getByRole('alert')).toContainText('Fullscreen could not be changed.');
    } finally {
      await desktop.close();
    }
  });
});
