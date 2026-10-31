import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { mediaFrame } from '../../src/shared/media';
import { connectDesktopMcp } from './mcp-client';

test('keeps focused inspector and canvas text in sync with MCP while preserving the caret for local acknowledgements', async () => {
  const profile = test.info().outputPath('profile');
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${profile}`],
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
  const client = await connectDesktopMcp(profile);
  try {
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    const page = await desktop.firstWindow();
    const heading = page.getByLabel('Heading', { exact: true });
    const canvas = page.getByRole('textbox', { name: 'Canvas heading', exact: true });
    const change = async (title: string): Promise<void> => {
      const snapshot = await page.evaluate(() => window.prezi.snapshot());
      if (!snapshot.ok) throw Error('No project');
      const slide = snapshot.value.project.slides[0];
      if (!slide) throw Error('No slide');
      expect(
        (
          await client.callTool({
            name: 'edit_project',
            arguments: {
              requestId: crypto.randomUUID(),
              expectedRevision: snapshot.value.revision,
              label: 'Update focused text',
              operations: [{ type: 'updateSlide', slideId: slide.id, patch: { title } }],
            },
          })
        ).isError,
      ).not.toBe(true);
    };
    await heading.focus();
    await change('Inspector collaboration');
    await expect(heading).toHaveValue('Inspector collaboration');
    await expect(heading).toBeFocused();
    await expect(canvas).toHaveText('Inspector collaboration');
    await heading.press('Home');
    await heading.press('ArrowRight');
    await heading.pressSequentially('123');
    await expect(heading).toHaveValue('I123nspector collaboration');
    await expect(canvas).toHaveText('I123nspector collaboration');
    await canvas.focus();
    await change('Canvas collaboration');
    await expect(canvas).toHaveText('Canvas collaboration');
    await expect(canvas).toBeFocused();
    await expect(heading).toHaveValue('Canvas collaboration');
    await canvas.press('Home');
    await canvas.press('ArrowRight');
    await canvas.pressSequentially('123');
    await expect(canvas).toHaveText('C123anvas collaboration');
    await expect(heading).toHaveValue('C123anvas collaboration');
    const snapshot = await page.evaluate(() => window.prezi.snapshot());
    if (!snapshot.ok) throw Error('No project');
    expect(
      (
        await client.callTool({
          name: 'undo',
          arguments: { requestId: crypto.randomUUID(), expectedRevision: snapshot.value.revision },
        })
      ).isError,
    ).not.toBe(true);
    await expect(canvas).toHaveText('C12anvas collaboration');
    await expect(heading).toHaveValue('C12anvas collaboration');
    await expect(canvas).toBeFocused();
    await desktop.evaluate(
      ({ dialog }, path) =>
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: path }),
        }),
      test.info().outputPath('numeric.prezi'),
    );
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    const x = page.getByLabel('Media X', { exact: true });
    await x.focus();
    const coordinate = async (next: number): Promise<void> => {
      const current = await page.evaluate(() => window.prezi.snapshot());
      if (!current.ok) throw Error('No project');
      const slide = current.value.project.slides[2];
      if (!slide?.media) throw Error('No media');
      expect(
        (
          await client.callTool({
            name: 'edit_project',
            arguments: {
              requestId: crypto.randomUUID(),
              expectedRevision: current.value.revision,
              label: 'Edit focused coordinate',
              operations: [
                {
                  type: 'updateMedia',
                  slideId: slide.id,
                  patch: { frame: { ...mediaFrame(slide.media), x: next } },
                },
              ],
            },
          })
        ).isError,
      ).not.toBe(true);
    };
    await coordinate(900);
    await expect(x).toHaveValue('900');
    await expect(x).toBeFocused();
    await x.fill('');
    await coordinate(875);
    await expect(x).toHaveValue('');
    await expect(page.getByRole('status')).toContainText('Changed elsewhere');
    await x.press('Escape');
    await expect(x).toHaveValue('875');
    await x.fill('850');
    await x.press('Control+s');
    await expect(page.getByText('Saved on this computer', { exact: true })).toBeVisible();
    const saved = await page.evaluate(() => window.prezi.snapshot());
    expect(saved).toMatchObject({ ok: true });
    if (!saved.ok) throw Error('No saved project');
    expect(saved.value.project.slides[2]?.media?.frame?.x).toBe(850);
    await expect(x).toBeFocused();
  } finally {
    await client.close();
    await desktop.close();
  }
});
