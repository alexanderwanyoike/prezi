import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';

test('fits custom scenes to the real viewport with usable video controls after resizing', async () => {
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
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    await page.getByLabel('Reveal text', { exact: false }).fill('Planning\nHuman testing');
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Create custom scene', exact: true }).click();
    await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit scene code', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    const frame = page.locator('iframe[title="Custom scene"]');
    const child = page.frameLocator('iframe[title="Custom scene"]');
    const controls = child.getByRole('button', { name: 'Play video', exact: true });
    await expect(controls).toBeAttached();
    await expect
      .poll(async () => {
        const box = await frame.boundingBox();
        const viewport = await child.locator('body').evaluate(() => window.innerWidth);
        return Math.abs((box?.width ?? 0) - viewport);
      })
      .toBeLessThan(1);
    await expect
      .poll(() => controls.evaluate((node) => node.getBoundingClientRect().width))
      .toBeCloseTo(32, 0);
    await child.locator('video').hover();
    await controls.click();
    await expect
      .poll(() => child.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.3);
    await desktop.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(1100, 740),
    );
    await expect
      .poll(async () => {
        const box = await frame.boundingBox();
        const content = await child
          .locator('.composition-transform')
          .evaluate(
            (node) => node.getBoundingClientRect().toJSON() as { width: number; height: number },
          );
        return Math.max(
          Math.abs((box?.width ?? 0) - content.width),
          Math.abs((box?.height ?? 0) - content.height),
        );
      })
      .toBeLessThan(1);
    await child.locator('video').hover();
    await child.getByRole('button', { name: 'Pause video', exact: true }).click();
    expect(await child.locator('video').evaluate((node: HTMLVideoElement) => node.paused)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath('custom-viewport.png') });
  } finally {
    await desktop.close();
  }
});
