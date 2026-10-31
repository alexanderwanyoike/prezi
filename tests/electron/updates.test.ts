import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createProject } from '../../src/shared/project';
import type { UpdateState } from '../../src/shared/updates';

test('shows installed update controls, progress and retryable restart errors through the application menu', async () => {
  const profile = test.info().outputPath('profile');
  await mkdir(profile, { recursive: true });
  const saved = createProject();
  const first = saved.slides[0];
  if (!first) throw new Error('Missing slide');
  first.title = 'Reopened after update';
  const path = test.info().outputPath('resume.json');
  await writeFile(path, JSON.stringify(saved));
  await writeFile(resolve(profile, 'update-resume.json'), JSON.stringify({ path }));
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
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Reopened after update');
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Application updates…', exact: true }),
    ).toBeVisible();
    await page.getByRole('menuitem', { name: 'Application updates…', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Application updates', exact: true }),
    ).toContainText('Updates are available in installed builds.');
    await page.keyboard.press('Escape');
    await desktop.evaluate(({ ipcMain, BrowserWindow }) => {
      let state: UpdateState = { stage: 'idle' };
      const snapshot = () => ({ installedVersion: '0.1.0', state });
      const publish = () =>
        BrowserWindow.getAllWindows()[0]?.webContents.send('updates:changed', snapshot());
      (['status', 'check', 'download', 'install'] as const).forEach((command) => {
        ipcMain.removeHandler(`updates:${command}`);
      });
      ipcMain.handle('updates:status', () => ({ ok: true, value: snapshot() }));
      ipcMain.handle('updates:check', () => {
        state = { stage: 'available', version: '0.2.0', automatic: true };
        publish();
        return { ok: true, value: snapshot() };
      });
      ipcMain.handle('updates:download', () => {
        state = { stage: 'downloading', version: '0.2.0', percent: 42 };
        publish();
        return new Promise((resolveDownload) => {
          ipcMain.once('updates:test:finish', () => {
            state = { stage: 'ready', version: '0.2.0' };
            publish();
            resolveDownload({ ok: true, value: snapshot() });
          });
        });
      });
      ipcMain.handle('updates:install', () => ({
        ok: false,
        error: { code: 'CANCELLED', message: 'Your presentation remains open.' },
      }));
      publish();
    });
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Application updates…', exact: true }).click();
    await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
    await page.getByRole('button', { name: 'Download 0.2.0', exact: true }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '42');
    await desktop.evaluate(({ ipcMain }) => ipcMain.emit('updates:test:finish'));
    await page.getByRole('button', { name: 'Restart to update', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Your presentation remains open.');
    await expect(
      page.getByRole('button', { name: 'Restart to update', exact: true }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Your presentation desk' })).toBeVisible();
  } finally {
    await desktop.close();
  }
});
