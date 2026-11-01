import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('fits a held scene after fullscreen even when resize observations are missed', async () => {
  const desktop = await electron.launch({
    args: [resolve('.'), `--user-data-dir=${test.info().outputPath('profile')}`],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Present', exact: true }).waitFor();
    await page.addInitScript(() => {
      const BrowserResizeObserver = ResizeObserver;
      class PausableResizeObserver extends BrowserResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          super((entries, observer) => {
            if (!document.documentElement.hasAttribute('data-hold-resize-observations')) {
              callback(entries, observer);
            }
          });
        }
      }
      Object.defineProperty(window, 'ResizeObserver', { value: PausableResizeObserver });
    });
    await page.reload();
    await desktop.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.maximize();
    });
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-hold-resize-observations', 'true');
    });
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeHidden();
    await expect
      .poll(() =>
        stage.evaluate((element) => {
          const scene = element.querySelector('.slide-scene');
          if (!scene) throw new Error('The slide scene is missing');
          const viewport = element.getBoundingClientRect();
          const content = scene.getBoundingClientRect();
          return Math.max(
            Math.abs(viewport.width - content.width),
            Math.abs(viewport.height - content.height),
          );
        }),
      )
      .toBeLessThan(1);
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect(stage).toHaveAttribute('data-reveal', '0');
    expect(
      await stage
        .getByRole('heading')
        .evaluate((heading) =>
          heading.parentElement ? getComputedStyle(heading.parentElement).opacity : 'missing',
        ),
    ).toBe('1');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary', { name: 'Slides' })).toBeVisible();
  } finally {
    await desktop.close();
  }
});
