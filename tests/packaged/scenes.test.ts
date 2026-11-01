import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openExample } from '../electron/open-example';
import { fileCommand } from '../electron/file-command';

test('compiles custom scenes in the installed application with portable fonts and held video', async () => {
  const desktop = await electron.launch({
    executablePath:
      process.env.PREZI_PACKAGED_EXECUTABLE ?? resolve('release/linux-unpacked/prezi'),
    args: ['--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
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
  let completed = false;
  const errors: string[] = [];
  try {
    await desktop.evaluate(
      ({ app, dialog }, paths) => {
        if (!app.isPackaged) throw Error('Expected installed app');
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: paths.project }),
          showOpenDialog: (_window: unknown, options: { title?: string }) =>
            Promise.resolve({
              canceled: false,
              filePaths: [options.title === 'Import font' ? paths.font : paths.project],
            }),
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        });
      },
      {
        font: resolve(
          'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
        ),
        project: test.info().outputPath('installed-scene.prezi'),
      },
    );
    await openExample(desktop);
    const page = await desktop.firstWindow();
    page.on('console', (message) => {
      if (message.type() === 'error' && errors.length < 20)
        errors.push(message.text().slice(0, 2000));
    });
    page.on('pageerror', (error) => {
      if (errors.length < 20) errors.push(error.message.slice(0, 2000));
    });
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    const imported = await page.evaluate(() => window.prezi.importFont());
    expect(imported.ok).toBe(true);
    const snapshot = await page.evaluate(() => window.prezi.snapshot());
    if (!snapshot.ok) throw Error(snapshot.error.message);
    const font = snapshot.value.project.fonts?.[0];
    if (!font) throw Error('No font');
    const license = await readFile('licenses/ibm-plex-mono.txt', 'utf8');
    const themed = await page.evaluate(
      ({ revision, id, notice }) =>
        window.prezi.edit({
          requestId: crypto.randomUUID(),
          expectedRevision: revision,
          label: 'Set imported font',
          operations: [
            { type: 'setTheme', patch: { bodyFont: id } },
            { type: 'updateFont', fontId: id, patch: { license: notice, provenance: 'IBM Plex' } },
          ],
        }),
      { revision: snapshot.value.revision, id: font.id, notice: license },
    );
    expect(themed.ok).toBe(true);
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    await page.getByLabel('Reveal text', { exact: false }).fill('Planning');
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Create custom scene', exact: true }).click();
    await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit scene code', exact: true })).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    const child = page.frameLocator('iframe[title="Custom scene"]');
    const heading = child.getByRole('textbox', { name: 'Canvas heading', exact: true });
    await heading.fill('Installed scene');
    await expect
      .poll(() =>
        child
          .locator('body')
          .evaluate(
            (_node, id) =>
              Array.from(document.fonts).some(
                (face) => face.family === `PreziFont_${id}` && face.status === 'loaded',
              ),
            font.id,
          ),
      )
      .toBe(true);
    await child.locator('video').hover();
    await child.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect
      .poll(() => child.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.4);
    await page.getByRole('button', { name: '01 Planning', exact: true }).click();
    await expect(child.getByText('Planning', { exact: true })).toBeVisible();
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await fileCommand(page, 'newProject');
    await fileCommand(page, 'open');
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    await expect(heading).toHaveText('Installed scene');
    await expect
      .poll(() =>
        child
          .locator('body')
          .evaluate(
            (_node, id) =>
              Array.from(document.fonts).some(
                (face) => face.family === `PreziFont_${id}` && face.status === 'loaded',
              ),
            font.id,
          ),
      )
      .toBe(true);
    const reopened = await page.evaluate(() => window.prezi.snapshot());
    if (!reopened.ok) throw Error(reopened.error.message);
    const catalog = await page.evaluate(
      (id) => window.prezi.sourceCatalog(id),
      reopened.value.sourceCatalogId,
    );
    if (!catalog.ok) throw Error(catalog.error.message);
    expect(reopened.value.project.sources).toBeUndefined();
    expect(catalog.value.files['scene-runtime/helpers.tsx']).toContain('function Media');
    expect(catalog.value.files['renderer/load-project-font.ts']).toContain('new FontFace');
    expect(reopened.value.project.fonts?.[0]?.license).toBe(license);
    expect(reopened.value.project.slides[2]?.media?.kind).toBe('video');
    await child.locator('video').hover();
    await child.getByRole('button', { name: 'Play video', exact: true }).click();
    await expect
      .poll(() => child.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.4);
    await page.screenshot({ path: test.info().outputPath('installed-custom-scene.png') });
    completed = true;
  } finally {
    if (!completed) {
      const page = desktop.windows()[0];
      if (page) {
        const body = await page
          .locator('body')
          .innerText({ timeout: 1500 })
          .catch(() => 'Page text unavailable.');
        await test.info().attach('installed-state', {
          body: JSON.stringify({
            body,
            errors,
            frames: page.frames().map((frame) => frame.url()),
          }),
          contentType: 'application/json',
        });
        await page
          .screenshot({ path: test.info().outputPath('installed-failure.png') })
          .catch(() => undefined);
      }
    }
    await desktop.close();
  }
});
