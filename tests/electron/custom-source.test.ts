import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { z } from 'zod';
import { openExample } from './open-example';
import { connectDesktopMcp } from './mcp-client';

test('compiles and validates shared scene source before atomically publishing it through MCP', async () => {
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
    const slide = initial.value.project.slides[1];
    if (!slide) throw Error('No slide');
    const request = {
      requestId: 'create-custom',
      expectedRevision: 1,
      slideId: slide.id,
      label: 'Build an editable scene',
      candidate: {
        id: crypto.randomUUID(),
        name: 'Editable explanation',
        fields: {
          headline: { type: 'text', label: 'Heading', default: 'An editable explanation' },
        },
        layers: [{ id: 'heading', label: 'Heading', property: 'headline' }],
        source: {
          entry: 'Scene.tsx',
          files: {
            'Scene.tsx': `import {AbsoluteFill} from 'remotion'; import {Text,Layer} from 'prezi'; export default function Scene(){return <AbsoluteFill style={{background:'#101513',color:'#edf2ec',fontSize:80,padding:128}}><Layer id="heading"><Text property="headline"/></Layer></AbsoluteFill>;}`,
          },
        },
      },
      properties: { headline: 'A shared custom scene' },
    };
    const submitted = await client.callTool({ name: 'compile_scene', arguments: request });
    expect(submitted.structuredContent).toMatchObject({
      result: { ok: true, value: { id: 'create-custom' } },
    });
    const statusSchema = z.object({
      result: z.object({
        ok: z.literal(true),
        value: z.object({ state: z.string(), error: z.object({ message: z.string() }).optional() }),
      }),
    });
    await expect
      .poll(
        async () =>
          statusSchema.parse(
            (await client.callTool({ name: 'read_job', arguments: { jobId: request.requestId } }))
              .structuredContent,
          ).result.value,
        { timeout: 15000 },
      )
      .toMatchObject({ state: 'complete' });
    const installed = await page.evaluate(() => window.prezi.snapshot());
    if (!installed.ok) throw Error(installed.error.message);
    expect(installed.value).toMatchObject({
      revision: 2,
      undoLabel: 'Agent: Build an editable scene',
      project: { scenes: { [request.candidate.id]: { source: request.candidate.source } } },
    });
    const source = await client.callTool({
      name: 'read_source',
      arguments: { path: `scenes/${request.candidate.id}/source/Scene.tsx`, length: 64000 },
    });
    expect(source.structuredContent).toMatchObject({
      result: { ok: true, value: { text: request.candidate.source.files['Scene.tsx'] } },
    });
    const bad = {
      ...request,
      requestId: 'invalid-custom',
      expectedRevision: 2,
      candidate: {
        ...request.candidate,
        source: {
          entry: 'Scene.tsx',
          files: {
            'Scene.tsx':
              'export default function Scene({reveal}:{reveal:number}){ if(reveal>0)throw new Error("Broken reveal"); return <div/>; }',
          },
        },
      },
    };
    expect(
      (await client.callTool({ name: 'compile_scene', arguments: bad })).structuredContent,
    ).toMatchObject({ result: { ok: true } });
    await expect
      .poll(
        async () =>
          statusSchema.parse(
            (await client.callTool({ name: 'read_job', arguments: { jobId: bad.requestId } }))
              .structuredContent,
          ).result.value,
        { timeout: 15000 },
      )
      .toMatchObject({ state: 'failed' });
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(installed);
    await client.callTool({
      name: 'undo',
      arguments: { requestId: 'undo-custom', expectedRevision: 2 },
    });
    expect(await page.evaluate(() => window.prezi.snapshot())).toMatchObject({
      ok: true,
      value: { project: initial.value.project },
    });
  } finally {
    await client.close();
    await desktop.close();
  }
});
