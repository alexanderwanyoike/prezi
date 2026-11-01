import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';
import { fileCommand } from './file-command';

test('authors transition code and properties while retaining bad drafts in portable projects', async () => {
  const projectPath = test.info().outputPath('transition.prezi');
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
      projectPath,
    );
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('tab', { name: 'Transition code', exact: true }).click();
    await page.getByRole('button', { name: 'Create transition code', exact: true }).click();
    await expect(
      page.getByRole('complementary', { name: 'Transition properties' }),
    ).not.toContainText('TRANSITION / Transition');
    await page.getByLabel('Distance (%)', { exact: true }).fill('9');
    await page.getByLabel('Transition duration (ms)', { exact: true }).fill('350');
    await page.getByRole('button', { name: 'Apply transition code', exact: true }).click();
    await expect
      .poll(
        async () => {
          const snapshot = await page.evaluate(() => window.prezi.snapshot());
          return snapshot.ok ? snapshot.value.project.transition?.properties.distance : null;
        },
        { timeout: 15000 },
      )
      .toBe(9);
    const accepted = await page.evaluate(() => window.prezi.snapshot());
    if (!accepted.ok) throw Error(accepted.error.message);
    expect(accepted.value.project.theme?.transitionMs).toBe(350);
    expect(accepted.value.project.transitionDraft).toBeUndefined();
    await expect(page.locator('.source-feedback')).toHaveText('Source applied.');
    await page.getByRole('button', { name: 'Edit transition code', exact: true }).click();
    await expect(page.locator('.source-feedback')).toHaveCount(0);
    const editor = page.locator('.cm-content[contenteditable="true"]');
    const bad = 'export default function transition(){return {opacity:"bad"};}';
    await editor.fill(bad);
    await page.getByRole('button', { name: 'Apply transition code', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Transition.tsx', { timeout: 15000 });
    const failed = await page.evaluate(() => window.prezi.snapshot());
    if (!failed.ok) throw Error(failed.error.message);
    expect(failed.value.project.transition).toEqual(accepted.value.project.transition);
    expect(failed.value.project.transitionDraft?.files['Transition.tsx']).toBe(bad);
    await fileCommand(page, 'saveAs');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await fileCommand(page, 'open');
    await expect(page.locator('.cm-content[contenteditable="true"]')).toHaveText(bad);
    const reopened = await page.evaluate(() => window.prezi.snapshot());
    if (!reopened.ok) throw Error(reopened.error.message);
    expect(reopened.value.project.transition).toEqual(accepted.value.project.transition);
    expect(reopened.value.project.transitionDraft?.files['Transition.tsx']).toBe(bad);
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.press('Space');
    await expect(stage).toHaveAttribute('data-slide', '2');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tab', { name: 'Transition code', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('.cm-content[contenteditable="true"]')).toHaveText(bad);
  } finally {
    await desktop.close();
  }
});
