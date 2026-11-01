import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { connectDesktopMcp } from './mcp-client';

test('positions mapped custom layers and media through shared canvas edits and portable saving', async () => {
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
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const slide = initial.value.project.slides[2];
    if (!slide) throw Error('No slide');
    const fields = {
      x: { type: 'number', label: 'X', default: 100, min: 0, max: 1200 },
      y: { type: 'number', label: 'Y', default: 250, min: 0, max: 700 },
      width: { type: 'number', label: 'Width', default: 700, min: 200, max: 900 },
      height: { type: 'number', label: 'Height', default: 300, min: 100, max: 500 },
    };
    const candidate = {
      id: crypto.randomUUID(),
      name: 'Mapped layer',
      fields,
      layers: [
        {
          id: 'panel',
          label: 'Panel',
          frame: { x: 'x', y: 'y', width: 'width', height: 'height' },
        },
      ],
      source: {
        entry: 'Scene.tsx',
        files: {
          'Scene.tsx': `import {AbsoluteFill} from 'remotion';import {Layer,Media} from 'prezi';export default function Scene(){return <AbsoluteFill style={{background:'#101513'}}><Layer id="panel" style={{left:0,top:0,width:10,height:10,background:'#204a35'}}/><Media/></AbsoluteFill>;}`,
        },
      },
    };
    await client.callTool({
      name: 'compile_scene',
      arguments: {
        requestId: 'mapped',
        expectedRevision: 0,
        label: 'Create mapped layer',
        slideId: slide.id,
        candidate,
        properties: {},
      },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'mapped' } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete' } } });
    await page.getByRole('button', { name: /^Slide 3:/ }).click();
    const child = page.frameLocator('iframe[title="Custom scene"]');
    await expect(child.locator('[data-layer="panel"]')).toHaveCSS('left', '100px');
    await child.locator('[data-layer="panel"]').click();
    const move = child.getByRole('button', { name: 'Move Panel', exact: true });
    await expect(move).toBeEnabled();
    const box = await move.boundingBox();
    if (!box) throw Error('No move handle');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 60, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => window.prezi.snapshot()))
      .toMatchObject({ ok: true, value: { revision: 2, undoLabel: 'Move or resize scene layer' } });
    const moved = await page.evaluate(() => window.prezi.snapshot());
    if (!moved.ok) throw Error(moved.error.message);
    const props = moved.value.project.slides[2]?.scene?.properties;
    expect(props?.x).toBeGreaterThan(100);
    expect(props?.y).toBeGreaterThan(250);
    await child.locator('video').click();
    await expect(child.getByRole('button', { name: 'Move media', exact: true })).toBeVisible();
    await expect
      .poll(
        async () => (await client.callTool({ name: 'read_view', arguments: {} })).structuredContent,
      )
      .toMatchObject({
        result: {
          ok: true,
          value: { selection: { slideId: slide.id, elementId: `${slide.id}:media` } },
        },
      });
    const file = test.info().outputPath('mapped.prezi');
    await desktop.evaluate(
      ({ dialog }, path) =>
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: path }),
          showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: [path] }),
        }),
      file,
    );
    const saved = await page.evaluate(() => window.prezi.save(true));
    expect(saved.ok).toBe(true);
    const opened = await page.evaluate(() => window.prezi.open());
    expect(opened.ok).toBe(true);
    const reopened = await page.evaluate(() => window.prezi.snapshot());
    if (!reopened.ok) throw Error(reopened.error.message);
    expect(reopened.value.project.slides[2]?.scene?.properties).toEqual(props);
    await page.screenshot({ path: test.info().outputPath('mapped-layer.png') });
  } finally {
    await client.close();
    await desktop.close();
  }
});
