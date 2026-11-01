import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';

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
    await openExample(desktop);
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

test('groups code typing and live colour input without losing the previous undo boundary', async () => {
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
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await page.getByRole('button', { name: 'Create custom scene', exact: true }).click();
    const before = await page.evaluate(async () => {
      const state = await window.prezi.snapshot();
      if (!state.ok) throw Error(state.error.message);
      const slide = state.value.project.slides[0];
      const draft = slide ? state.value.project.drafts?.[slide.id] : null;
      if (!draft || !slide) throw Error('No draft');
      const text = draft.files[draft.entry];
      if (text === undefined) throw Error('No source file');
      return { id: slide.id, entry: draft.entry, text };
    });
    const editor = page.getByRole('textbox', { name: 'Scene source code' });
    await editor.press('Control+End');
    await editor.press('Enter');
    await editor.pressSequentially(`// ${'x'.repeat(60)}`);
    const readDraft = async () => {
      const state = await page.evaluate(() => window.prezi.snapshot());
      return state.ok ? state.value.project.drafts?.[before.id]?.files[before.entry] : null;
    };
    await expect.poll(readDraft).toBe(`${before.text}\n// ${'x'.repeat(60)}`);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(readDraft).toBe(before.text);
    const prior = await page.evaluate(() => window.prezi.snapshot());
    if (!prior.ok) throw Error(prior.error.message);
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Presentation theme…', exact: true }).click();
    const accent = page.getByLabel('Accent colour', { exact: true });
    await accent.focus();
    await accent.evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) throw Error('No colour input');
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (!descriptor?.set) throw Error('No native input setter');
      Array.from(
        { length: 60 },
        (_, index) => `#${(0x00ff00 + index).toString(16).padStart(6, '0')}`,
      ).forEach((value) => {
        descriptor.set?.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await expect
      .poll(async () => {
        const state = await page.evaluate(() => window.prezi.snapshot());
        return state.ok ? state.value.project.theme?.accent : null;
      })
      .toBe('#00ff3b');
    await page.getByRole('button', { name: 'Close presentation theme', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect
      .poll(async () => {
        const state = await page.evaluate(() => window.prezi.snapshot());
        return state.ok ? state.value.project.theme : null;
      })
      .toEqual(prior.value.project.theme);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveAttribute(
      'title',
      `Undo: ${prior.value.undoLabel ?? ''}`,
    );
  } finally {
    await desktop.close();
  }
});
