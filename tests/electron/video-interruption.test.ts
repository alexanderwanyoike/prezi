import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('pauses a pending native play request without showing a codec failure', async () => {
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
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    const video = page.locator('video');
    await expect(video).toBeVisible();
    await video.evaluate((element) => {
      if (!(element instanceof HTMLVideoElement)) throw Error('No video');
      const nativePlay = element.play.bind(element);
      element.play = () => {
        element.dataset.playRequested = 'true';
        const source = new URL(element.src);
        source.searchParams.set('interruption', crypto.randomUUID());
        element.src = source.toString();
        element.load();
        const request = nativePlay();
        element.pause();
        element.dataset.interrupted = 'true';
        void request.then(
          () => {
            element.dataset.playResult = 'fulfilled';
          },
          (error: unknown) => {
            element.dataset.playResult = error instanceof DOMException ? error.name : 'rejected';
          },
        );
        return request;
      };
      element.preload = 'none';
      element.load();
    });
    await video.hover();
    await page.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect(video).toHaveAttribute('data-interrupted', 'true');
    await expect(video).toHaveAttribute('data-play-requested', 'true');
    await expect(video).toHaveAttribute('data-play-result', 'AbortError');
    await video.evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          resolve();
        }),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          resolve();
        }),
      );
    });
    await expect(video).toHaveJSProperty('paused', true);
    await expect(page.locator('.scene-video')).toHaveAttribute('data-blocked', 'false');
  } finally {
    await desktop.close();
  }
});
