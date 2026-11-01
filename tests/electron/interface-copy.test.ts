import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('keeps editor panels focused on controls without decorative filler', async () => {
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
    const page = await desktop.firstWindow();
    const inspector = page.getByRole('complementary', { name: 'Slide properties' });
    await expect(inspector.getByLabel('Heading', { exact: true })).toBeEditable();
    await expect(page.locator('body')).not.toContainText('THE 0SMOSYS SHOW');
    await expect(inspector).not.toContainText('A QUIET STAGE');
    await expect(inspector).not.toContainText('The story is yours.');
    await expect(page.getByRole('complementary', { name: 'Slides' })).not.toContainText(
      'Made for your next explanation.',
    );
    await expect(page.getByRole('region', { name: 'Reveal overview' })).not.toContainText(
      'One thought at a time.',
    );
    await expect(inspector).not.toContainText('Nothing moves on without you.');
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    const appearance = page.getByRole('dialog', { name: 'Appearance preferences' });
    await expect(appearance.getByRole('button', { name: 'Dark', exact: true })).toBeVisible();
    await expect(appearance).not.toContainText('Make yourself at home.');
  } finally {
    await desktop.close();
  }
});

test('keeps a new deck and its code layout free of generated slide text', async () => {
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
    await page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'New presentation', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Heading', exact: true })).toHaveValue('');
    await page.getByLabel('Layout', { exact: true }).selectOption('code');
    await expect(page.getByRole('textbox', { name: 'Code', exact: true })).toHaveValue('');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await expect(stage).not.toContainText('Untitled slide');
    await expect(stage).not.toContainText('SOURCE / WALKTHROUGH');
    await expect(stage).not.toContainText('Add your code here');
    await page.keyboard.press('Escape');
  } finally {
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    await desktop.close();
  }
});
