import { _electron as electron, expect, test } from '@playwright/test';
import { openAsBlob } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BlobReader, ZipReader } from '@zip.js/zip.js';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { z } from 'zod';
import { fileCommand } from '../electron/file-command';

test('ships a working Electron editor with fonts portable saving code and MCP', async () => {
  const profile = test.info().outputPath('profile');
  const desktop = await electron.launch({
    executablePath:
      process.env.PREZI_PACKAGED_EXECUTABLE ?? resolve('release/linux-unpacked/prezi'),
    args: ['--mute-audio', `--user-data-dir=${profile}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      PREZI_MCP_PORT: '0',
      XDG_DATA_HOME: test.info().outputPath('data'),
    },
  });
  const client = new Client({ name: 'prezi-installed-test', version: '1.0.0' });
  try {
    const path = test.info().outputPath('installed.prezi');
    await desktop.evaluate(({ app, dialog }, file) => {
      if (!app.isPackaged) throw new Error('Expected an installed application');
      Object.assign(dialog, {
        showSaveDialog: () => Promise.resolve({ canceled: false, filePath: file }),
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, path);
    const page = await desktop.firstWindow();
    await expect(page.getByRole('textbox', { name: 'Presentation name', exact: true })).toHaveValue(
      'Untitled presentation',
    );
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText('');
    await expect(page.getByRole('button', { name: /^Slide \d+:/ })).toHaveCount(1);
    await expect(page.locator('video')).toHaveCount(0);
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .fill('An installed presentation desk');
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    const archive = new ZipReader(new BlobReader(await openAsBlob(path)), { useWebWorkers: false });
    try {
      expect((await archive.getEntries()).map((entry) => entry.filename)).toEqual(
        expect.arrayContaining([
          'project.json',
          'source/renderer/presentation/SlideScene.tsx',
          'fonts/manrope/LICENSE',
          'fonts/manrope/index.css',
          'fonts/ibm-plex-mono/LICENSE',
        ]),
      );
    } finally {
      await archive.close();
    }
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Scene source code' })).toContainText(
      'useCurrentFrame',
    );
    const metadataInput: unknown = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
    const metadata = z.object({ version: z.string() }).parse(metadataInput);
    const status = await page.evaluate(() => window.prezi.updateStatus());
    expect(status).toMatchObject({
      ok: true,
      value: { installedVersion: process.env.PREZI_EXPECTED_VERSION ?? metadata.version },
    });
    if (status.ok) expect(status.value.state.stage).not.toBe('disabled');
    const input: unknown = JSON.parse(
      await readFile(resolve(profile, 'mcp-connection.json'), 'utf8'),
    );
    const connection = z.object({ url: z.url(), token: z.string() }).parse(input);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(connection.url), {
        requestInit: { headers: { Authorization: `Bearer ${connection.token}` } },
      }),
    );
    expect(
      (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
    ).toMatchObject({
      result: {
        ok: true,
        value: {
          project: {
            slides: expect.arrayContaining([
              expect.objectContaining({ title: 'An installed presentation desk' }),
            ]),
          },
        },
      },
    });
    await page.screenshot({ path: test.info().outputPath('installed-editor.png') });
  } finally {
    await client.close();
    await desktop.close();
  }
});
