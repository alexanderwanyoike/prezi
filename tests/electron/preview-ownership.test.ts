import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { connectDesktopMcp } from './mcp-client';

test('leaves agent capture running when the human starts and cancels their own thumbnail', async () => {
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
    const page = await desktop.firstWindow();
    const capture = page.getByRole('button', { name: 'Update selected thumbnail', exact: true });
    await expect(capture).toBeEnabled();
    await desktop.evaluate(({ app }) => {
      app.on('web-contents-created', (_event, contents) => {
        const load = contents.loadURL.bind(contents);
        Object.defineProperty(contents, 'loadURL', {
          value: async (url: string): Promise<void> => {
            if (url.startsWith('prezi-scene:'))
              await new Promise<void>((done) => {
                setTimeout(done, 8000);
              });
            return load(url);
          },
        });
      });
    });
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const slide = initial.value.project.slides[0];
    if (!slide) throw Error('No slide');
    await client.callTool({
      name: 'capture_preview',
      arguments: {
        requestId: 'preview:agent-owned',
        expectedRevision: initial.value.revision,
        slideId: slide.id,
        reveal: 0,
      },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'preview:agent-owned' } }))
            .structuredContent,
      )
      .toMatchObject({ result: { ok: true, value: { state: 'rendering' } } });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    await expect(capture).toBeEnabled({ timeout: 1000 });
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
    await capture.click();
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancel).toBeVisible();
    await cancel.click();
    await expect(cancel).toHaveCount(0);
    await expect(capture).toBeEnabled();
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'preview:agent-owned' } }))
            .structuredContent,
        { timeout: 12000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete' } } });
    await expect(page.getByAltText(`Rendered preview: ${slide.title}`)).toBeVisible();
    const jobs = await page.evaluate(() => window.prezi.previews());
    if (!jobs.ok) throw Error(jobs.error.message);
    expect(jobs.value.filter((job) => job.id !== 'preview:agent-owned')).toEqual([
      expect.objectContaining({ state: 'cancelled' }),
    ]);
  } finally {
    await client.close();
    await desktop.close();
  }
});
