import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { connectDesktopMcp } from './mcp-client';
import { fileCommand } from './file-command';

test('imports a decoded font, edits its credits and keeps it working after portable save and reopen', async () => {
  const notice = await readFile('licenses/ibm-plex-mono.txt', 'utf8');
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
    await desktop.evaluate(
      ({ dialog }, paths) =>
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: paths.project }),
          showOpenDialog: (_window: unknown, options: { title?: string }) =>
            Promise.resolve({
              canceled: false,
              filePaths: [options.title === 'Import font' ? paths.font : paths.project],
            }),
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        }),
      {
        font: resolve(
          'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
        ),
        project: test.info().outputPath('font.prezi'),
      },
    );
    const page = await desktop.firstWindow();
    await page.getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Import font…', exact: true }).click();
    const theme = page.getByRole('dialog', { name: 'Presentation theme', exact: true });
    const font = await expect
      .poll(async () => {
        const result = await page.evaluate(() => window.prezi.snapshot());
        return result.ok ? result.value.project.fonts?.length : 0;
      })
      .toBe(1)
      .then(async () => {
        const result = await page.evaluate(() => window.prezi.snapshot());
        if (!result.ok || !result.value.project.fonts?.[0]) throw Error('Missing font');
        return result.value.project.fonts[0];
      });
    await theme.getByLabel('Body font', { exact: true }).selectOption(font.id);
    const credit = theme.getByRole('group', { name: font.name, exact: true });
    await credit
      .getByLabel('Source / attribution', { exact: true })
      .fill('IBM Plex / local verification fixture');
    await credit.getByLabel('Licence notice', { exact: true }).fill(notice);
    await expect
      .poll(() =>
        theme
          .getByRole('button', { name: 'Close presentation theme', exact: true })
          .evaluate((node) => {
            const box = node.getBoundingClientRect();
            return node.contains(
              document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
            );
          }),
      )
      .toBe(true);
    await theme.getByRole('button', { name: 'Close presentation theme', exact: true }).click();
    const loaded = () =>
      page.evaluate(
        (id) =>
          Array.from(document.fonts).some(
            (face) => face.family === `PreziFont_${id}` && face.status === 'loaded',
          ),
        font.id,
      );
    await expect.poll(loaded).toBe(true);
    await expect(page.locator('.slide-scene')).toHaveCSS(
      'font-family',
      `PreziFont_${font.id}, sans-serif`,
    );
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await fileCommand(page, 'newProject');
    await fileCommand(page, 'open');
    await expect.poll(loaded).toBe(true);
    const reopened = await page.evaluate(() => window.prezi.snapshot());
    expect(reopened).toMatchObject({
      ok: true,
      value: {
        project: {
          fonts: [
            {
              id: font.id,
              provenance: 'IBM Plex / local verification fixture',
              license: notice,
            },
          ],
        },
      },
    });

    const client = await connectDesktopMcp(test.info().outputPath('profile'));
    try {
      expect(
        (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
      ).toMatchObject({ result: { ok: true, value: { project: { fonts: [{ id: font.id }] } } } });
      expect(
        (await client.callTool({ name: 'read_font', arguments: { fontId: font.id } }))
          .structuredContent,
      ).toMatchObject({
        result: {
          ok: true,
          value: { license: notice },
        },
      });
      if (!reopened.ok) throw Error('Project did not reopen');
      const request = {
        requestId: 'agent-font-import',
        expectedRevision: reopened.value.revision,
        path: resolve(
          'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
        ),
        credit: { provenance: 'Agent supplied copy', license: 'Supplied notice' },
      };
      const imported = await client.callTool({ name: 'import_font', arguments: request });
      expect(imported.structuredContent).toMatchObject({ result: { ok: true } });
      expect(
        (await client.callTool({ name: 'import_font', arguments: request })).structuredContent,
      ).toEqual(imported.structuredContent);
      const after = await page.evaluate(() => window.prezi.snapshot());
      expect(after).toMatchObject({
        ok: true,
        value: { project: { fonts: [{ id: font.id }, { provenance: 'Agent supplied copy' }] } },
      });
      await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
        'Vibez / how I built it',
      );
    } finally {
      await client.close();
    }
  } finally {
    await desktop.close();
  }
});
