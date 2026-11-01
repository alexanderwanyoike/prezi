import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('undoes a typing gesture once and retains the prior agent batch', async () => {
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
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    const baseline = await page.evaluate(async () => {
      const state = await window.prezi.snapshot();
      if (!state.ok) throw Error(state.error.message);
      return window.prezi.edit({
        requestId: 'agent-baseline',
        expectedRevision: state.value.revision,
        label: 'Agent batch',
        operations: [{ type: 'renameProject', name: 'Agent deck' }],
      });
    });
    if (!baseline.ok) throw Error(baseline.error.message);
    const heading = page.getByRole('textbox', { name: 'Heading', exact: true });
    await heading.fill('');
    await heading.pressSequentially('x'.repeat(60));
    await expect
      .poll(async () => {
        const state = await page.evaluate(() => window.prezi.snapshot());
        return state.ok ? state.value.project.slides[0]?.title : null;
      })
      .toBe('x'.repeat(60));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(heading).toHaveValue('Vibez / how I built it');
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveAttribute(
      'title',
      'Undo: Agent batch',
    );
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Presentation name', exact: true })).toHaveValue(
      'Vibez / how I built it',
    );
  } finally {
    await desktop.close();
  }
});
