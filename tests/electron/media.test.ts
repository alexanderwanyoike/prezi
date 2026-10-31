import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('imports an image into the scene and serves bounded ranges without exposing arbitrary files', async () => {
  await mkdir(test.info().outputDir, { recursive: true });
  const path = test.info().outputPath('sample.png');
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );
  await writeFile(path, bytes);
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
    await desktop.evaluate(({ dialog }, filePath) => {
      Object.assign(dialog, {
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [filePath] }),
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, path);
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Import media', exact: true }).click({ timeout: 2000 });
    const image = page.getByRole('img', { name: 'sample.png', exact: true });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((node) => node instanceof HTMLImageElement && node.naturalWidth))
      .toBe(1);
    const url = await image.getAttribute('src');
    if (!url) throw new Error('Missing image source');
    const range = await page.evaluate(async (source) => {
      const response = await fetch(source, { headers: { Range: 'bytes=0-7' } });
      return {
        status: response.status,
        range: response.headers.get('Content-Range'),
        bytes: [...new Uint8Array(await response.arrayBuffer())],
      };
    }, url);
    expect(range).toEqual({
      status: 206,
      range: `bytes 0-7/${bytes.length.toString()}`,
      bytes: [...bytes.subarray(0, 8)],
    });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(image).toHaveCount(0);
    const missing = await page.evaluate(async (source) => (await fetch(source)).status, url);
    expect(missing).toBe(404);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(image).toBeVisible();
    await page.getByRole('button', { name: 'Remove media', exact: true }).click({ timeout: 1000 });
    await expect(image).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(image).toBeVisible();
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect(image).toBeVisible();
  } finally {
    await desktop.close();
  }
});
