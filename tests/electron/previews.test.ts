import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { z } from 'zod';
import { openExample } from './open-example';
import { connectDesktopMcp } from './mcp-client';
import { previewResultSchema } from '../../src/shared/preview';

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
  await openExample(desktop);
  const page = await desktop.firstWindow();
  await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
  const client = await connectDesktopMcp(profile);
  try {
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
        expectedRevision: 1,
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
          value: { state: 'complete', revision: 1, image: { width: 960, height: 540 } },
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
    await expect(page.getByAltText('Rendered preview: Workflow')).toBeVisible();
    const workers = await desktop.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
    );
    expect(workers).toBe(1);
  } finally {
    await client.close();
    await desktop.close();
  }
});

test('captures the entire custom composition rather than its upper-left viewport', async () => {
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
  await openExample(desktop);
  const page = await desktop.firstWindow();
  await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
  const client = await connectDesktopMcp(profile);
  try {
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const slide = initial.value.project.slides[1];
    if (!slide) throw Error('No slide');
    await client.callTool({
      name: 'compile_scene',
      arguments: {
        requestId: 'preview-scene',
        expectedRevision: 1,
        label: 'Preview frame',
        slideId: slide.id,
        candidate: {
          id: crypto.randomUUID(),
          name: 'Frame',
          fields: {},
          layers: [],
          source: {
            entry: 'Scene.tsx',
            files: {
              'Scene.tsx':
                "import {AbsoluteFill} from 'remotion'; export default function Scene(){ return <AbsoluteFill style={{background:'#123456'}}><div style={{position:'absolute',left:1720,top:880,width:200,height:200,background:'#ff0000'}}/></AbsoluteFill>; }",
            },
          },
        },
        properties: {},
      },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'preview-scene' } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete' } } });
    await client.callTool({
      name: 'capture_preview',
      arguments: {
        requestId: 'preview:full-frame',
        expectedRevision: 2,
        slideId: slide.id,
        reveal: 0,
      },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'preview:full-frame' } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete' } } });
    const captured = z
      .object({ result: previewResultSchema })
      .parse(
        (await client.callTool({ name: 'read_job', arguments: { jobId: 'preview:full-frame' } }))
          .structuredContent,
      ).result;
    if (!captured.ok || !captured.value.image) throw Error('No captured image');
    const pixel = await desktop.evaluate(({ nativeImage }, dataUrl) => {
      const image = nativeImage.createFromDataURL(dataUrl);
      const bytes = image.toBitmap();
      const offset = (500 * image.getSize().width + 920) * 4;
      return { red: bytes[offset + 2], green: bytes[offset + 1], blue: bytes[offset] };
    }, captured.value.image.dataUrl);
    expect(pixel.red).toBeGreaterThan(230);
    expect(pixel.green).toBeLessThan(30);
    expect(pixel.blue).toBeLessThan(30);
  } finally {
    await client.close();
    await desktop.close();
  }
});
