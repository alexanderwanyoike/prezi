import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('moves and resizes attached media on the canvas with atomic undo and cancelled gestures', async () => {
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
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    await page.locator('video').click();
    const move = page.getByRole('button', { name: 'Move media', exact: true });
    await expect(move).toBeVisible();
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const box = await move.boundingBox();
    if (!box) throw Error('No move handle');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 50, box.y + box.height / 2 + 20, { steps: 5 });
    expect(await page.evaluate(() => window.prezi.snapshot())).toMatchObject({
      ok: true,
      value: { revision: initial.value.revision },
    });
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => window.prezi.snapshot()))
      .toMatchObject({
        ok: true,
        value: { revision: initial.value.revision + 1, undoLabel: 'Move or resize media' },
      });
    const moved = await page.evaluate(() => window.prezi.snapshot());
    if (!moved.ok) throw Error(moved.error.message);
    expect(moved.value.project.slides[2]?.media?.frame?.x).toBeLessThan(1000);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.prezi.snapshot()))
      .toMatchObject({ ok: true, value: { project: { slides: initial.value.project.slides } } });
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resize media', exact: true })).toBeVisible();
    const resize = await page
      .getByRole('button', { name: 'Resize media', exact: true })
      .boundingBox();
    if (!resize) throw Error('No resize handle');
    await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2);
    await page.mouse.down();
    await page.mouse.move(resize.x + resize.width / 2 - 40, resize.y + resize.height / 2 - 30, {
      steps: 4,
    });
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => window.prezi.snapshot()))
      .toMatchObject({ ok: true, value: { revision: initial.value.revision + 4 } });
    const beforeCancel = await page.evaluate(() => window.prezi.snapshot());
    const cancel = await move.boundingBox();
    if (!cancel) throw Error('No cancel handle');
    await page.mouse.move(cancel.x + cancel.width / 2, cancel.y + cancel.height / 2);
    await page.mouse.down();
    await page.mouse.move(cancel.x + 70, cancel.y + 70);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(beforeCancel);
    await page.locator('video').hover();
    await page.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect
      .poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.3);
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(beforeCancel);
  } finally {
    await desktop.close();
  }
});
