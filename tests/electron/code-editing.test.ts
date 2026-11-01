import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { fileCommand } from './file-command';

test('retains code drafts in portable saves and applies only validated source to the viewer', async () => {
  const path = test.info().outputPath('source-draft.prezi');
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
      ({ dialog }, file) =>
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: file }),
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [file] }),
          showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
        }),
      path,
    );
    const page = await desktop.firstWindow();
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Create custom scene', exact: true }).click();
    const code = page.getByRole('textbox', { name: 'Scene source code' });
    await expect(code).toHaveAttribute('aria-readonly', 'false');
    await code.fill('export default function Scene(){return <div>Saved draft</div>;}');
    await fileCommand(page, 'save');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
      'Vibez / how I built it',
    );
    await fileCommand(page, 'newProject');
    await fileCommand(page, 'open');
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(code).toHaveText(
      'export default function Scene(){return <div>Saved draft</div>;}',
    );
    await page.getByRole('button', { name: /^Slide 2:/ }).click();
    await expect(code).not.toContainText('Saved draft');
    await page.getByRole('button', { name: /^Slide 1:/ }).click();
    await expect(code).toContainText('Saved draft');
    await code.fill('export default function Scene(){return <div>;}');
    await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Scene.tsx');
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
      'Vibez / how I built it',
    );
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await code.fill(
      'export default function Scene(){return <div style={{color:"white",fontSize:80,padding:128}}>An applied scene</div>;}',
    );
    await page.getByRole('button', { name: 'Apply scene code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit scene code', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('tab', { name: 'Canvas', exact: true }).click();
    await expect(
      page
        .frameLocator('iframe[title="Custom scene"]')
        .getByText('An applied scene', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(code).toContainText('An applied scene');
  } finally {
    await desktop.close();
  }
});
