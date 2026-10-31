import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('keeps video independent of held reveal frames and stops inactive slide media', async () => {
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
    await desktop.evaluate(({ dialog }, path) => {
      Object.assign(dialog, {
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, resolve('tests/fixtures/held-video.webm'));
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Import media', exact: true }).click();
    await page.getByLabel('Reveal text', { exact: false }).fill('First thought\nSecond thought');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    const video = stage.locator('video');
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.6);
    await expect(stage).toHaveAttribute('data-reveal', '0');
    const heldVideo = await video.elementHandle();
    if (!heldVideo) throw new Error('Missing active video');
    await page.getByRole('button', { name: 'Next reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-reveal', '1');
    expect(await heldVideo.evaluate((node: HTMLVideoElement) => node.isConnected)).toBe(true);
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.8);
    await video.evaluate((node: HTMLVideoElement) => {
      node.currentTime = node.duration - 0.15;
    });
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.ended)).toBe(true);
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await page.getByRole('button', { name: 'Restart video', exact: true }).click();
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => !node.paused && node.currentTime < 1))
      .toBe(true);
    await page.getByRole('button', { name: 'Next reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Next reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-slide', '2');
    await expect
      .poll(() => heldVideo.evaluate((node: HTMLVideoElement) => node.paused && node.muted))
      .toBe(true);
    await expect(stage.locator('video')).toHaveCount(0);
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Previous reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => !node.paused && node.currentTime < 1))
      .toBe(true);
  } finally {
    await desktop.close();
  }
});
