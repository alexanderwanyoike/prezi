import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { connectDesktopMcp } from './mcp-client';
import { fileCommand } from './file-command';

test('edits deck styling through View, saves it portably and uses it in presentation', async () => {
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
      ({ dialog }, path) =>
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: path }),
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        }),
      test.info().outputPath('theme.prezi'),
    );
    const page = await desktop.firstWindow();
    await page.getByRole('menuitem', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Presentation theme…', exact: true }).click();
    const theme = page.getByRole('dialog', { name: 'Presentation theme', exact: true });
    await theme.getByLabel('Background', { exact: true }).fill('#f4f0e8');
    await theme.getByLabel('Text colour', { exact: true }).fill('#18221c');
    await theme.getByLabel('Secondary text', { exact: true }).fill('#52645a');
    await theme.getByLabel('Body font', { exact: true }).selectOption('plex');
    await theme.getByLabel('Canvas padding', { exact: true }).fill('96');
    await theme.getByRole('button', { name: 'Close presentation theme', exact: true }).click();
    const scene = page.locator('.slide-scene');
    await expect(scene).toHaveCSS('background-color', 'rgb(244, 240, 232)');
    await expect(scene).toHaveCSS('padding', '96px');
    await expect(scene).toHaveCSS('font-family', '"IBM Plex Mono", monospace');
    const client = await connectDesktopMcp(test.info().outputPath('profile'));
    try {
      expect(
        (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
      ).toMatchObject({
        result: {
          ok: true,
          value: { project: { theme: { background: '#f4f0e8', bodyFont: 'plex' } } },
        },
      });
    } finally {
      await client.close();
    }
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await fileCommand(page, 'newProject');
    await fileCommand(page, 'open');
    await expect(scene).toHaveCSS('background-color', 'rgb(244, 240, 232)');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect(scene).toHaveCSS('padding', '96px');
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Create custom scene', exact: true }).click();
    await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit scene code', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    await expect(
      page
        .frameLocator('iframe[title="Custom scene"]')
        .getByRole('textbox', { name: 'Canvas body', exact: true }),
    ).toHaveCSS('color', 'rgb(82, 100, 90)');
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Edit scene code', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Scene source code' })
      .fill(
        `import {AbsoluteFill} from 'remotion'; import type {SceneProps} from 'prezi'; export default function Scene({theme}:SceneProps){if(theme.background !== '#f4f0e8') throw Error('Wrong validation theme');return <AbsoluteFill style={{background:theme.background,color:theme.foreground,padding:theme.padding,fontFamily:theme.fontFamily,fontSize:100}}>Theme reached code</AbsoluteFill>;}`,
      );
    await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit scene code', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    const custom = page
      .frameLocator('iframe[title="Custom scene"]')
      .getByText('Theme reached code', { exact: true });
    await expect(custom).toHaveCSS('background-color', 'rgb(244, 240, 232)');
    await expect(custom).toHaveCSS('padding', '96px');
    await page.evaluate(async () => {
      const snapshot = await window.prezi.snapshot();
      if (!snapshot.ok) throw Error(snapshot.error.message);
      return window.prezi.edit({
        requestId: crypto.randomUUID(),
        expectedRevision: snapshot.value.revision,
        label: 'A live theme change',
        operations: [{ type: 'setTheme', patch: { background: '#000000' } }],
      });
    });
    await expect(page.getByRole('alert')).toContainText('Wrong validation theme');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(custom).toHaveCSS('background-color', 'rgb(244, 240, 232)');
  } finally {
    await desktop.close();
  }
});
