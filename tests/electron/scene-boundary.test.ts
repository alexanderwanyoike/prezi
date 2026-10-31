import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { z } from 'zod';
import { connectDesktopMcp } from './mcp-client';

test('validates a full-size muted composition with script dialogs blocked by the response sandbox', async () => {
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
  const page = await desktop.firstWindow();
  await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
  const client = await connectDesktopMcp(profile);
  try {
    const policy = await desktop.evaluate(async ({ net }, instance) => {
      const response = await net.fetch(`prezi-scene://${instance}/index.html`);
      return response.headers.get('Content-Security-Policy');
    }, crypto.randomUUID());
    expect(policy).toContain('sandbox allow-scripts allow-same-origin');
    await desktop.evaluate(({ app, dialog }) => {
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
      app.on('browser-window-created', (_event, window) => {
        window.webContents.once('did-finish-load', () => {
          if (window.webContents.getURL().startsWith('prezi-scene://'))
            process.env.PREZI_TEST_VALIDATOR_MUTED = JSON.stringify(
              window.webContents.isAudioMuted(),
            );
        });
      });
    });
    const snapshot = await page.evaluate(() => window.prezi.snapshot());
    if (!snapshot.ok) throw Error(snapshot.error.message);
    const slide = snapshot.value.project.slides[0];
    if (!slide) throw Error('No slide');
    await client.callTool({
      name: 'compile_scene',
      arguments: {
        requestId: 'full-size-boundary',
        expectedRevision: 0,
        slideId: slide.id,
        label: 'Validate renderer setup',
        candidate: {
          id: crypto.randomUUID(),
          name: 'Scene boundary',
          fields: {},
          layers: [],
          source: {
            entry: 'Scene.tsx',
            files: {
              'Scene.tsx':
                "export default function Scene(){if(window.innerWidth!==1920||window.innerHeight!==1080)throw Error('Incorrect composition viewport');if(window.confirm('Dialog must be blocked'))throw Error('Dialog was allowed');return <div>Scene boundary</div>;}",
            },
          },
        },
        properties: {},
      },
    });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: 'full-size-boundary' } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete' } } });
    const muted = await desktop.evaluate(() => process.env.PREZI_TEST_VALIDATOR_MUTED);
    expect(z.stringbool().parse(muted)).toBe(true);
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeEnabled();
  } finally {
    await client.close();
    await desktop.close();
  }
});
