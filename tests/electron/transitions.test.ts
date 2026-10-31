import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { connectDesktopMcp } from './mcp-client';

test('applies sampled transition code once and preserves the working transition after a bad frame', async () => {
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
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain(
      'compile_transition',
    );
    const request = {
      requestId: 'transition:accepted',
      expectedRevision: 0,
      label: 'Program slide motion',
      candidate: {
        id: crypto.randomUUID(),
        name: 'Slide motion',
        fields: { distance: { type: 'number', label: 'Distance', default: 4, min: 0, max: 100 } },
        source: {
          entry: 'Transition.tsx',
          files: {
            'Transition.tsx': `import type {TransitionProps,TransitionStyle} from 'prezi';
export default function transition({progress,direction,navigation,props}:TransitionProps):TransitionStyle {
const sign=navigation==='advance'?1:-1;
return {opacity:direction==='entering'?progress:1-progress,x:sign*props.distance*(direction==='entering'?1-progress:-progress)};
}`,
          },
        },
      },
      properties: { distance: 6 },
    };
    expect(
      (await client.callTool({ name: 'compile_transition', arguments: request })).structuredContent,
    ).toMatchObject({ result: { ok: true, value: { id: request.requestId } } });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: request.requestId } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({ result: { ok: true, value: { state: 'complete', revision: 1 } } });
    const accepted = await page.evaluate(() => window.prezi.snapshot());
    if (!accepted.ok) throw Error(accepted.error.message);
    expect(accepted.value.project.transition).toMatchObject({
      source: request.candidate.source,
      properties: { distance: 6 },
    });
    expect(accepted.value.project.transition?.samples.advance.entering).toHaveLength(61);
    expect(accepted.value.project.transition?.samples.advance.entering[0]).toMatchObject({
      opacity: 0,
      x: 6,
    });
    expect(accepted.value.project.transition?.samples.back.entering[0]).toMatchObject({
      opacity: 0,
      x: -6,
    });
    expect(accepted.value.project.transition?.samples.advance.entering[60]).toMatchObject({
      opacity: 1,
      x: 0,
    });
    expect(
      (await client.callTool({ name: 'compile_transition', arguments: request })).structuredContent,
    ).toMatchObject({ result: { ok: true, value: { state: 'complete', revision: 1 } } });
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(accepted);
    const broken = {
      ...request,
      requestId: 'transition:broken',
      expectedRevision: 1,
      candidate: {
        ...request.candidate,
        source: {
          ...request.candidate.source,
          files: {
            'Transition.tsx': request.candidate.source.files['Transition.tsx'].replace(
              'return {',
              "if(progress>0.5)throw Error('Broken transition frame');return {",
            ),
          },
        },
      },
    };
    await client.callTool({ name: 'compile_transition', arguments: broken });
    await expect
      .poll(
        async () =>
          (await client.callTool({ name: 'read_job', arguments: { jobId: broken.requestId } }))
            .structuredContent,
        { timeout: 15000 },
      )
      .toMatchObject({
        result: {
          ok: true,
          value: {
            state: 'failed',
            error: { message: expect.stringContaining('Broken transition frame') },
          },
        },
      });
    expect(await page.evaluate(() => window.prezi.snapshot())).toEqual(accepted);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await page.evaluate(() => window.prezi.snapshot())).toMatchObject({
      ok: true,
      value: { revision: 2 },
    });
    const undone = await page.evaluate(() => window.prezi.snapshot());
    if (!undone.ok) throw Error(undone.error.message);
    expect(undone.value.project.transition).toBeUndefined();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await page.evaluate(() => window.prezi.snapshot())).toMatchObject({
      ok: true,
      value: { revision: 3, project: { transition: accepted.value.project.transition } },
    });
  } finally {
    await client.close();
    await desktop.close();
  }
});
