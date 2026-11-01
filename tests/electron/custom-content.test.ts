import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';

test('retains attached video and real reveal content when creating an editable custom scene', async () => {
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
    const child = page.frameLocator('iframe[title="Custom scene"]');
    const video = child.locator('video');
    await expect(video).toBeVisible();
    await expect(child.getByText('Planning', { exact: true })).toHaveCount(0);
    await video.evaluate(async (node: HTMLVideoElement) => node.play());
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.3);
    const handle = await video.elementHandle();
    await page.getByRole('button', { name: '01 Planning', exact: true }).click();
    await expect(child.getByText('Planning', { exact: true })).toBeVisible();
    expect(
      await handle.evaluate((node: HTMLVideoElement) => node.isConnected && !node.paused),
    ).toBe(true);
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.7);
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    const advance = async (remaining: number): Promise<void> => {
      if (remaining === 0) return;
      await page.keyboard.press('Space');
      await expect(stage).toHaveAttribute('data-busy', 'false');
      await advance(remaining - 1);
    };
    await advance(6);
    await expect(stage).toHaveAttribute('data-slide', '3');
    const presented = page.frameLocator('iframe[title="Custom scene"]');
    const presentedVideo = presented.locator('video');
    await expect(presentedVideo).toBeVisible();
    await expect
      .poll(() => presentedVideo.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.4);
    const presentedHandle = await presentedVideo.elementHandle();
    await advance(1);
    await expect(presented.getByText('Planning', { exact: true })).toBeVisible();
    expect(
      await presentedHandle.evaluate((node: HTMLVideoElement) => node.isConnected && !node.paused),
    ).toBe(true);
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await page.keyboard.press('Escape');
    const snapshot = await page.evaluate(() => window.prezi.snapshot());
    if (!snapshot.ok) throw Error(snapshot.error.message);
    const slide = snapshot.value.project.slides[2];
    expect(slide?.media?.kind).toBe('video');
    expect(slide?.reveals).toEqual(['Planning', 'Human testing']);
  } finally {
    await desktop.close();
  }
});
