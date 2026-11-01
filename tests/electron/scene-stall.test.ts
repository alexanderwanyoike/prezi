import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { openExample } from './open-example';
import { connectDesktopMcp } from './mcp-client';

test('stops a property-dependent stalled scene and recovers with Undo without blocking the editor', async () => {
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
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    const initial = await page.evaluate(() => window.prezi.snapshot());
    if (!initial.ok) throw Error(initial.error.message);
    const slide = initial.value.project.slides[0];
    if (!slide) throw Error('No slide');
    const candidate = {
      id: crypto.randomUUID(),
      name: 'Stall recovery',
      fields: { stall: { type: 'boolean', label: 'Stall scene', default: false } },
      layers: [],
      source: {
        entry: 'Scene.tsx',
        files: {
          'Scene.tsx': `import type {SceneProps} from 'prezi';export default function Scene({props}:SceneProps){if(props.stall){while(true){}}return <div style={{color:'white',fontSize:60}}>Scene</div>;}`,
        },
      },
    };
    await client.callTool({
      name: 'compile_scene',
      arguments: {
        requestId: 'stall',
        expectedRevision: 1,
        label: 'Create scene',
        slideId: slide.id,
        candidate,
        properties: {},
      },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'stall' } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete' } } });
    const child = page.frameLocator('iframe[title="Custom scene"]');
    await expect(child.getByText('Scene', { exact: true })).toBeVisible();
    const pid = await desktop.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.webContents.mainFrame.frames.find((f) =>
          f.url.startsWith('prezi-scene://'),
        )?.osProcessId,
    );
    if (!pid) throw Error('No scene PID');
    await page.getByRole('checkbox', { name: 'Stall scene', exact: true }).check();
    await expect(page.getByRole('alert').filter({ hasText: 'stopped responding' })).toBeVisible({
      timeout: 12000,
    });
    await expect
      .poll(() =>
        desktop.evaluate(({ app }, id) => app.getAppMetrics().some((m) => m.pid === id), pid),
      )
      .toBe(false);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(child.getByText('Scene', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Stall scene', exact: true }).check();
    const departingPid = await desktop.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.webContents.mainFrame.frames.find((f) =>
          f.url.startsWith('prezi-scene://'),
        )?.osProcessId,
    );
    await page.getByRole('button', { name: /^Slide 2:/ }).click();
    await expect(page.getByRole('textbox', { name: 'Canvas heading', exact: true })).toBeVisible();
    await expect
      .poll(() =>
        desktop.evaluate(
          ({ app }, id) => app.getAppMetrics().some((m) => m.pid === id),
          departingPid,
        ),
      )
      .toBe(false);
  } finally {
    await client.close();
    await desktop.close();
  }
});
