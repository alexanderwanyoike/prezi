import { _electron as electron, expect, test } from '@playwright/test';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { connectDesktopMcp } from './mcp-client';
import { fileCommand } from './file-command';
import { defaultPresentationTheme } from '../../src/shared/presentation-theme';

test('locates missing media and a selected font, retains settings and notices, then reopens the repaired archive', async () => {
  const legacy = test.info().outputPath('missing.json');
  const saved = test.info().outputPath('repaired.prezi');
  const replacement = test.info().outputPath('replacement.png');
  await copyFile('resources/icons/icon.png', replacement);
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
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error('No project');
    const first = initial.value.project.slides[0];
    if (!first) throw Error('No slide');
    const fontId = crypto.randomUUID();
    const mediaId = crypto.randomUUID();
    await writeFile(
      legacy,
      JSON.stringify({
        ...initial.value.project,
        slides: [
          {
            ...first,
            media: {
              id: mediaId,
              name: 'Missing image',
              kind: 'image',
              extension: 'png',
              frame: { x: 950, y: 260, width: 840, height: 560 },
              fit: 'cover',
              provenance: 'Original image attribution',
              license: 'Original media notice',
            },
          },
        ],
        fonts: [
          {
            id: fontId,
            name: 'Missing type',
            extension: 'woff2',
            provenance: 'Original font attribution',
            license: await readFile('licenses/ibm-plex-mono.txt', 'utf8'),
          },
        ],
        theme: { ...defaultPresentationTheme, bodyFont: fontId },
      }),
    );
    await desktop.evaluate(
      ({ dialog }, paths) => {
        let opened = paths.legacy;
        Object.assign(dialog, {
          showSaveDialog: () => {
            opened = paths.saved;
            return Promise.resolve({ canceled: false, filePath: paths.saved });
          },
          showOpenDialog: (_window: unknown, options: { title?: string }) => {
            let path = opened;
            if (options.title === 'Locate media') path = paths.replacement;
            if (options.title === 'Locate font') path = paths.font;
            return Promise.resolve({ canceled: false, filePaths: [path] });
          },
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        });
      },
      {
        legacy,
        saved,
        replacement,
        font: resolve(
          'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
        ),
      },
    );
    await fileCommand(page, 'open');
    await expect(page.locator('.canvas-wrap').getByRole('alert')).toContainText('Missing image');
    await expect(page.locator('.status-bar').getByRole('alert')).toContainText('Missing type');
    await page.getByRole('button', { name: 'Locate replacement…', exact: true }).click();
    await expect(page.locator('.canvas-wrap img')).toHaveJSProperty('complete', true);
    await expect
      .poll(() =>
        page
          .locator('.canvas-wrap img')
          .evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0)),
      )
      .toBeGreaterThan(0);
    await expect(page.getByLabel('Media X', { exact: true })).toHaveValue('950');
    await expect(page.getByLabel('Media fit', { exact: true })).toHaveValue('cover');
    await expect(page.getByLabel('Media source / attribution', { exact: true })).toHaveValue(
      'Original image attribution',
    );
    await page
      .getByLabel('Media source / attribution', { exact: true })
      .fill('Generated app icon / recovery fixture');
    await page.getByRole('menuitem', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Presentation theme…', exact: true }).click();
    const theme = page.getByRole('dialog', { name: 'Presentation theme', exact: true });
    await theme
      .getByRole('group', { name: 'Missing type', exact: true })
      .getByRole('button', { name: 'Locate font…', exact: true })
      .click();
    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() => window.prezi.snapshot());
        return snapshot.ok ? snapshot.value.project.theme?.bodyFont : fontId;
      })
      .not.toBe(fontId);
    await theme.getByRole('button', { name: 'Close presentation theme', exact: true }).click();
    await expect(page.locator('.status-bar').getByRole('alert')).toHaveCount(0);
    const repaired = await page.evaluate(() => window.prezi.snapshot());
    if (!repaired.ok) throw Error('No repaired project');
    expect(repaired.value.project.fonts).toHaveLength(1);
    expect(repaired.value.project.fonts?.[0]).toMatchObject({
      provenance: 'Original font attribution',
    });
    await fileCommand(page, 'saveAs');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await fileCommand(page, 'newProject');
    await fileCommand(page, 'open');
    await expect(page.locator('.canvas-wrap img')).toHaveJSProperty('complete', true);
    await expect(page.getByLabel('Media source / attribution', { exact: true })).toHaveValue(
      'Generated app icon / recovery fixture',
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            Array.from(document.fonts).filter(
              (face) => face.family.startsWith('PreziFont_') && face.status === 'loaded',
            ).length,
        ),
      )
      .toBe(1);
    const client = await connectDesktopMcp(test.info().outputPath('profile'));
    try {
      const snapshot = await page.evaluate(() => window.prezi.snapshot());
      if (!snapshot.ok) throw Error('No project');
      const slide = snapshot.value.project.slides[0];
      if (!slide?.media) throw Error('No repaired media');
      const request = {
        requestId: 'agent-media-repair',
        expectedRevision: snapshot.value.revision,
        slideId: slide.id,
        path: replacement,
        replace: true,
        credit: { provenance: 'Agent supplied image attribution' },
      };
      const result = await client.callTool({ name: 'import_media', arguments: request });
      expect(result.structuredContent).toMatchObject({ result: { ok: true } });
      expect(
        (await client.callTool({ name: 'import_media', arguments: request })).structuredContent,
      ).toEqual(result.structuredContent);
      await expect(page.getByLabel('Media source / attribution', { exact: true })).toHaveValue(
        'Agent supplied image attribution',
      );
      await expect(page.getByLabel('Media X', { exact: true })).toHaveValue('950');
      const current = await page.evaluate(() => window.prezi.snapshot());
      if (!current.ok) throw Error('No project');
      const font = current.value.project.fonts?.[0];
      if (!font) throw Error('No font');
      expect(
        (
          await client.callTool({
            name: 'import_font',
            arguments: {
              requestId: 'agent-font-repair',
              expectedRevision: current.value.revision,
              path: resolve(
                'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
              ),
              replaceFontId: font.id,
            },
          })
        ).structuredContent,
      ).toMatchObject({ result: { ok: true } });
      const replaced = await page.evaluate(() => window.prezi.snapshot());
      expect(replaced).toMatchObject({ ok: true });
      if (!replaced.ok) throw Error('No project');
      expect(replaced.value.project.fonts).toHaveLength(1);
      expect(replaced.value.project.theme?.bodyFont).not.toBe(font.id);
      expect(replaced.value.project.fonts?.[0]?.license).toBe(font.license);
    } finally {
      await client.close();
    }
  } finally {
    await desktop.close();
  }
});
