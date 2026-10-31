import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { contrast, saturation } from '../colors';

test('renders saturated accents and readable labels in every material and mode', async () => {
  const desktop = await electron.launch({
    args: [resolve('.'), `--user-data-dir=${test.info().outputPath('profile')}`],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    const materials = ['Studio', 'Aluminium', 'Paper'];
    const modes = ['Light', 'Dark'];
    const accents = ['Sage', 'Cobalt', 'Amber', 'Plum', 'Copper'];
    const appearances = materials.flatMap((material) =>
      modes.flatMap((mode) => accents.map((accent) => ({ material, mode, accent }))),
    );
    await appearances.reduce<Promise<void>>(
      (previous, { material, mode, accent }) =>
        previous.then(async () => {
          await page.getByRole('button', { name: material, exact: true }).click();
          await page.getByRole('button', { name: mode, exact: true }).click();
          const choice = page.getByRole('button', { name: accent, exact: true });
          await choice.click();
          const primary = await page
            .getByRole('button', { name: 'Present', exact: true })
            .evaluate((button) => ({
              foreground: getComputedStyle(button).color,
              background: getComputedStyle(button).backgroundColor,
            }));
          const swatch = await choice
            .locator('span')
            .evaluate((span) => getComputedStyle(span).backgroundColor);
          expect(
            saturation(primary.background),
            `${material} ${mode} ${accent} saturation`,
          ).toBeGreaterThanOrEqual(0.8);
          expect(
            contrast(primary.foreground, primary.background),
            `${material} ${mode} ${accent} label contrast`,
          ).toBeGreaterThanOrEqual(4.5);
          expect(swatch, `${material} ${mode} ${accent} swatch`).toBe(primary.background);
        }),
      Promise.resolve(),
    );
  } finally {
    await desktop.close();
  }
});
