import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';

test('releases presentation navigation when custom-scene preparation never replies', async () => {
  test.setTimeout(45000);
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
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    const submitted = await page.evaluate(async () => {
      const initial = await window.prezi.snapshot();
      if (!initial.ok) throw Error(initial.error.message);
      const slide = initial.value.project.slides[0];
      if (!slide) throw Error('No slide');
      return window.prezi.submitScene({
        requestId: 'startup-scene',
        expectedRevision: initial.value.revision,
        label: 'Create scene',
        slideId: slide.id,
        candidate: {
          id: crypto.randomUUID(),
          name: 'Scene',
          fields: {},
          layers: [],
          source: {
            entry: 'Scene.tsx',
            files: { 'Scene.tsx': 'export default()=> <div>Scene</div>' },
          },
        },
        properties: {},
      });
    });
    if (!submitted.ok) throw Error(submitted.error.message);
    await expect
      .poll(() => page.evaluate(() => window.prezi.sceneJob('startup-scene')), { timeout: 15000 })
      .toMatchObject({ ok: true, value: { state: 'complete' } });
    await expect(
      page.frameLocator('iframe[title="Custom scene"]').getByText('Scene', { exact: true }),
    ).toBeVisible();
    await desktop.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('scenes:prepare');
      ipcMain.handle(
        'scenes:prepare',
        () =>
          new Promise<never>(() => {
            /* Simulates a lost preparation reply. */
          }),
      );
    });
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(page.getByRole('alert')).toContainText('did not become ready', { timeout: 13000 });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-slide', '2');
    await page.keyboard.press('Escape');
  } finally {
    await desktop.close();
  }
});
