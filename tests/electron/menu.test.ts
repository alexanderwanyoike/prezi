import { _electron as electron, expect, test } from '@playwright/test';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { openAsBlob } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('uses application menus, desktop shortcuts and Canvas/Code workspace tabs', async () => {
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
        showSaveDialog: () => Promise.resolve({ canceled: false, filePath: path }),
        showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
    }, test.info().outputPath('menu-deck.prezi'));
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { name: 'Your presentation desk' })).toBeVisible();
    await expect(
      page.getByRole('banner').getByRole('button', { name: 'Save', exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .fill('An application workspace');
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Edit', exact: true }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Undo: Edit scene text', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await page.keyboard.press('Control+2');
    await expect(page.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('textbox', { name: 'Scene source code' })).toBeVisible();
    await page.getByRole('tab', { name: 'Code', exact: true }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Canvas', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Canvas', exact: true }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Code', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Code', exact: true }).press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Canvas', exact: true })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Canvas heading' })).toHaveText(
      'An application workspace',
    );
    await page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'New presentation', exact: true }).click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Untitled slide');
    await page.keyboard.press('Control+o');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
      'An application workspace',
    );
    await page
      .getByRole('menubar')
      .getByRole('menuitem', { name: 'File', exact: true })
      .press('ArrowDown');
    await expect(
      page.getByRole('menuitem', { name: 'New presentation', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menu', { name: 'Edit', exact: true })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('menu', { name: 'File', exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu', { name: 'File' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeFocused();
    await page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'File' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    const source = page.getByRole('textbox', { name: 'Scene source code', exact: true });
    await source.focus();
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Edit', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Select all', exact: true }).click();
    await page.getByRole('menubar').getByRole('menuitem', { name: 'Edit', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();
    const expectedSource = await readFile(
      resolve('src/renderer/presentation/SlideScene.tsx'),
      'utf8',
    );
    await expect
      .poll(() => desktop.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe(expectedSource);
    await source.press('ArrowRight');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await expect
      .poll(() => desktop.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe(expectedSource);
  } finally {
    await desktop.close();
  }
});

test('saves the final queued text edit before closing from the keyboard', async () => {
  const path = test.info().outputPath('closing.prezi');
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
  });
  const lifecycle = { closed: false };
  desktop.on('close', () => {
    lifecycle.closed = true;
  });
  try {
    await desktop.evaluate(({ dialog }, filePath) => {
      Object.assign(dialog, {
        showSaveDialog: () => Promise.resolve({ canceled: false, filePath }),
        showMessageBox: () => Promise.resolve({ response: 0, checkboxChecked: false }),
      });
    }, path);
    const page = await desktop.firstWindow();
    const text = 'Closing keeps the final queued edit.';
    await page.getByRole('textbox', { name: 'Canvas heading', exact: true }).fill('');
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .evaluate((node, value) => {
        Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(value)).forEach(
          ({ segment, index }) => {
            Object.assign(node, { textContent: value.slice(0, index + segment.length) });
            node.dispatchEvent(
              new InputEvent('input', { bubbles: true, inputType: 'insertText', data: segment }),
            );
          },
        );
      }, text);
    const closed = desktop.waitForEvent('close');
    await page.keyboard.press('Control+w').catch(() => undefined);
    await closed;
    const zip = new ZipReader(new BlobReader(await openAsBlob(path)), { useWebWorkers: false });
    try {
      const content = (await zip.getEntries()).find((entry) => entry.filename === 'project.json');
      if (!content || content.directory) throw new Error('Missing saved project');
      const project: unknown = JSON.parse(await content.getData(new TextWriter()));
      expect(project).toMatchObject({
        slides: expect.arrayContaining([expect.objectContaining({ title: text })]),
      });
    } finally {
      await zip.close();
    }
  } finally {
    if (!lifecycle.closed) await desktop.close();
  }
});
