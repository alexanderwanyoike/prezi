import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { connectDesktopMcp } from './mcp-client';
import { fileCommand } from './file-command';

test('rejects oversized imports and blocks oversized archived images before serving them', async () => {
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
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const slide = initial.value.project.slides[0];
    if (!slide) throw Error('No slide');
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );
    bytes.writeUInt32BE(8193, 16);
    await mkdir(test.info().outputDir, { recursive: true });
    const path = test.info().outputPath('large.png');
    await writeFile(path, bytes);
    await desktop.evaluate(
      ({ dialog }, file) =>
        Object.assign(dialog, {
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [file] }),
        }),
      path,
    );
    await fileCommand(page, 'importMedia');
    await expect(page.getByRole('alert').filter({ hasText: '8192' })).toBeVisible();
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(initial);
    await page.screenshot({ path: test.info().outputPath('oversized-image.png') });
    const client = await connectDesktopMcp(test.info().outputPath('profile'));
    try {
      expect(
        (
          await client.callTool({
            name: 'import_media',
            arguments: { requestId: 'oversized', expectedRevision: 0, slideId: slide.id, path },
          })
        ).structuredContent,
      ).toMatchObject({ result: { ok: false, error: { code: 'INVALID_INPUT' } } });
    } finally {
      await client.close();
    }
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(initial);
    const id = crypto.randomUUID();
    const project = {
      ...initial.value.project,
      slides: [{ ...slide, media: { id, name: 'large.png', kind: 'image', extension: 'png' } }],
    };
    const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
    await writer.add(
      'manifest.json',
      new TextReader(JSON.stringify({ format: 'prezi', version: 1, sceneVersion: 1 })),
    );
    await writer.add('project.json', new TextReader(JSON.stringify(project)));
    await writer.add(`assets/${id}.png`, new Uint8ArrayReader(bytes));
    const archive = test.info().outputPath('oversized.prezi');
    await writeFile(archive, new Uint8Array(await (await writer.close()).arrayBuffer()));
    await desktop.evaluate(
      ({ dialog }, file) =>
        Object.assign(dialog, {
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [file] }),
        }),
      archive,
    );
    const opened = await page.evaluate(() => window.prezi.open());
    expect(opened.ok).toBe(true);
    const served = await page.evaluate(async (resource) => {
      const response = await fetch(resource);
      return { status: response.status, body: await response.text() };
    }, `prezi-media://asset/${id}`);
    expect(served).toMatchObject({ status: 400, body: expect.stringContaining('8192') });
    expect(
      await page.evaluate(
        async (resource) => (await fetch(resource, { method: 'HEAD' })).status,
        `prezi-media://asset/${id}`,
      ),
    ).toBe(400);
  } finally {
    await desktop.close();
  }
});
