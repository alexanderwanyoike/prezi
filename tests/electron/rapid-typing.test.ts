import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('retains every character typed while accepted field updates are arriving', async () => {
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
    const heading = page.getByRole('textbox', { name: 'Heading', exact: true });
    await expect(heading).toHaveValue('Vibez / how I built it');
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    await heading.fill('');
    await heading.pressSequentially('x'.repeat(60));
    await expect(heading).toHaveValue('x'.repeat(60));
    await expect
      .poll(async () => {
        const state = await page.evaluate(() => window.prezi.snapshot());
        return state.ok ? state.value.project.slides[0]?.title : null;
      })
      .toBe('x'.repeat(60));
  } finally {
    await desktop.close();
  }
});
