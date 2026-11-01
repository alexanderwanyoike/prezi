import { _electron as electron, expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileCommand } from './file-command';
import { connectDesktopMcp } from './mcp-client';

test('reads archived reference code separately from edits and retains it across portable saves', async () => {
  const profile = test.info().outputPath('profile');
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${profile}`],
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
  const client = await connectDesktopMcp(profile);
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const source = 'export const ArchivedReference = true;';
    const path = test.info().outputPath('reference.prezi.json');
    const saved = test.info().outputPath('reference.prezi');
    await writeFile(
      path,
      JSON.stringify({
        ...initial.value.project,
        slides: initial.value.project.slides.slice(0, 1),
        sources: { 'renderer/presentation/SlideScene.tsx': source },
      }),
    );
    await desktop.evaluate(
      ({ dialog }, input) =>
        Object.assign(dialog, {
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [input.path] }),
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: input.saved }),
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        }),
      { path, saved },
    );
    await fileCommand(page, 'open');
    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() => window.prezi.snapshot());
        return snapshot.ok && snapshot.value.filePath;
      })
      .toBe(path);
    const opened = await page.evaluate(() => window.prezi.snapshot());
    if (!opened.ok) throw Error(opened.error.message);
    expect(opened.value.project.sources).toBeUndefined();
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(page.locator('.cm-content')).toContainText(source);
    const read = await client.callTool({
      name: 'read_source',
      arguments: { path: 'renderer/presentation/SlideScene.tsx', length: 64000 },
    });
    expect(read.structuredContent).toMatchObject({ result: { ok: true, value: { text: source } } });
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    await page.getByRole('textbox', { name: 'Heading', exact: true }).fill('Vibez');
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
      'Vibez',
    );
    const edited = await page.evaluate(() => window.prezi.snapshot());
    expect(JSON.stringify(edited)).not.toContain('ArchivedReference');
    await fileCommand(page, 'saveAs');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await desktop.evaluate(
      ({ dialog }, next) =>
        Object.assign(dialog, {
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [next] }),
        }),
      saved,
    );
    await fileCommand(page, 'open');
    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() => window.prezi.snapshot());
        return snapshot.ok && snapshot.value.filePath;
      })
      .toBe(saved);
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(page.locator('.cm-content')).toContainText(source);
  } finally {
    await client.close();
    await desktop.close();
  }
});
