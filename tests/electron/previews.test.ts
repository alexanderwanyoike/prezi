import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { connectDesktopMcp } from './mcp-client';

test('captures a different slide from Code without changing the shared project or selection', async () => {
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
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const slide = initial.value.project.slides[1];
    if (!slide) throw Error('No slide');
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain('capture_preview');
    const submitted = await client.callTool({
      name: 'capture_preview',
      arguments: {
        requestId: 'preview:code-test',
        expectedRevision: 0,
        slideId: slide.id,
        reveal: 4,
      },
    });
    expect(submitted.structuredContent).toMatchObject({
      result: { ok: true, value: { id: 'preview:code-test' } },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'preview:code-test' } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({
        result: {
          ok: true,
          value: { state: 'complete', revision: 0, image: { width: 960, height: 540 } },
        },
      });
    const image = await client.callTool({
      name: 'read_preview',
      arguments: { jobId: 'preview:code-test' },
    });
    expect(image.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'image', mimeType: 'image/jpeg' })]),
    );
    await expect(page.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('button', { name: /^Slide 1:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(initial);
    await expect(
      page.getByAltText('Rendered preview: From idea to something useful'),
    ).toBeVisible();
    const workers = await desktop.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
    );
    expect(workers).toBe(1);
  } finally {
    await client.close();
    await desktop.close();
  }
});
