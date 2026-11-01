import { test } from '@playwright/test';
import type { ElectronApplication } from '@playwright/test';
import { writeExampleProject } from '../fixtures/example-project';

export async function openExample(desktop: ElectronApplication): Promise<void> {
  const path = await writeExampleProject(test.info().outputPath('example'));
  await desktop.evaluate(({ dialog }, filePath) => {
    const original = dialog.showOpenDialog.bind(dialog);
    Object.assign(dialog, {
      showOpenDialog: () => {
        Object.assign(dialog, { showOpenDialog: original });
        return Promise.resolve({ canceled: false, filePaths: [filePath] });
      },
    });
  }, path);
  const page = await desktop.firstWindow();
  await page.getByRole('button', { name: 'Present', exact: true }).waitFor();
  const opened = await page.evaluate(() => window.prezi.open());
  if (!opened.ok) throw Error(opened.error.message);
}
