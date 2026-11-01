import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';
import { fileCommand } from './file-command';

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
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await fileCommand(page, 'importMedia');
    await page.getByLabel('Reveal text', { exact: false }).fill('First thought\nSecond thought');
    const previewVideo = page.locator('.workspace video');
    await page.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect
      .poll(() => previewVideo.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.3);
    const previewHandle = await previewVideo.elementHandle();
    await page.getByRole('button', { name: '01 First thought', exact: true }).click();
    expect(
      await previewHandle.evaluate((node: HTMLVideoElement) => node.isConnected && !node.paused),
    ).toBe(true);
    await page.getByRole('button', { name: 'Restart preview', exact: true }).click();
    await expect
      .poll(() =>
        previewVideo.evaluate((node: HTMLVideoElement) => node.paused && node.currentTime === 0),
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    const video = stage.locator('video');
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.6);
    await expect(stage).toHaveAttribute('data-reveal', '0');
    const heldVideo = await video.elementHandle();
    await page.getByRole('button', { name: 'Next reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-reveal', '1');
    expect(await heldVideo.evaluate((node: HTMLVideoElement) => node.isConnected)).toBe(true);
    await expect
      .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.8);
    await video.evaluate((node: HTMLVideoElement) => {
      Object.assign(node, { currentTime: node.duration - 0.15 });
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

test('configures playback and placement while media controls keep keyboard focus', async () => {
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
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await fileCommand(page, 'importMedia');
    await page.getByLabel('Autoplay video', { exact: true }).uncheck({ timeout: 1500 });
    await page.getByLabel('Loop video', { exact: true }).check();
    await page.getByLabel('Mute video', { exact: true }).uncheck();
    await page.getByLabel('Video volume', { exact: true }).fill('0.35');
    await page.getByLabel('Video volume', { exact: true }).press('Tab');
    await page.getByLabel('Media fit', { exact: true }).selectOption('cover');
    await page.getByLabel('Media X', { exact: true }).fill('950');
    await page.getByLabel('Media X', { exact: true }).press('Tab');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    const video = stage.locator('video');
    await expect
      .poll(() =>
        video.evaluate((node: HTMLVideoElement) => ({
          paused: node.paused,
          muted: node.muted,
          loop: node.loop,
          volume: node.volume,
          fit: getComputedStyle(node).objectFit,
        })),
      )
      .toEqual({ paused: true, muted: false, loop: true, volume: 0.35, fit: 'cover' });
    await page.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.paused)).toBe(false);
    await page.getByRole('button', { name: 'Pause video', exact: true }).press('Space');
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.paused)).toBe(true);
    await expect(stage).toHaveAttribute('data-slide', '1');
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Media X', { exact: true })).toHaveValue('950');
  } finally {
    await desktop.close();
  }
});
