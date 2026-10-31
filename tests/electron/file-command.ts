import type { Page } from '@playwright/test';

const labels = {
  newProject: 'New presentation',
  open: 'Open…',
  save: 'Save',
  saveAs: 'Save as…',
  importMedia: 'Import media…',
} as const;
export async function fileCommand(page: Page, command: keyof typeof labels): Promise<void> {
  await page.getByRole('menubar').getByRole('menuitem', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: labels[command], exact: true }).click();
}
