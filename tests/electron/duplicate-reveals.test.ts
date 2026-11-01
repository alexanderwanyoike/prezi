import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

(['editor', 'presenter'] as const).forEach((surface) => {
  test(`reconciles identical reveal rows after an edit in the ${surface}`, async () => {
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
      const change = async (reveals: string[]): Promise<void> => {
        const result = await page.evaluate(async (next) => {
          const current = await window.prezi.snapshot();
          if (!current.ok) return current;
          const slide = current.value.project.slides[0];
          if (!slide) throw Error('No slide');
          return window.prezi.edit({
            requestId: crypto.randomUUID(),
            expectedRevision: current.value.revision,
            label: 'Edit reveal rows',
            operations: [{ type: 'updateSlide', slideId: slide.id, patch: { reveals: next } }],
          });
        }, reveals);
        expect(result.ok).toBe(true);
      };
      await change(['Repeat', 'Repeat']);
      if (surface === 'presenter') {
        await page.getByRole('button', { name: 'Present', exact: true }).click();
        const stage = page.getByRole('region', { name: 'Presentation stage' });
        await expect(stage).toHaveAttribute('data-busy', 'false');
        await page.keyboard.press('Space');
        await expect(stage).toHaveAttribute('data-busy', 'false');
        await page.keyboard.press('Space');
        await expect(stage).toHaveAttribute('data-busy', 'false');
        await expect(stage.getByText('Repeat', { exact: true })).toHaveCount(2);
        await change(['Changed', 'Repeat']);
        await expect(stage.getByText('Changed', { exact: true })).toHaveCount(1);
        await expect(stage.getByText('Repeat', { exact: true })).toHaveCount(1);
        await expect(stage).toHaveAttribute('data-reveal', '2');
        await page.keyboard.press('Escape');
      } else {
        const overview = page.getByRole('region', { name: 'Reveal overview' });
        await expect(overview.getByRole('button')).toHaveCount(3);
        await change(['Changed', 'Repeat']);
        await expect(overview.getByRole('button')).toHaveCount(3);
        await expect(overview.getByText('Repeat', { exact: true })).toHaveCount(1);
      }
    } finally {
      await desktop.close();
    }
  });
});
