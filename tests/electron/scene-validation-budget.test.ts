import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('validates every reveal and entrance frame with slower renderer round trips', async () => {
  test.setTimeout(90000);
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
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    await desktop.evaluate(({ app, dialog }) => {
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      });
      app.on('web-contents-created', (_event, contents) => {
        const execute = contents.executeJavaScript.bind(contents);
        Object.defineProperty(contents, 'executeJavaScript', {
          value: async (code: string, userGesture?: boolean): Promise<unknown> => {
            if (contents.getURL().startsWith('prezi-scene:'))
              await new Promise<void>((done) => {
                setTimeout(done, 50);
              });
            const value: unknown = await execute(code, userGesture);
            return value;
          },
        });
      });
    });
    const submitted = await page.evaluate(async () => {
      const initial = await window.prezi.snapshot();
      if (!initial.ok) throw Error(initial.error.message);
      const slide = initial.value.project.slides[0];
      if (!slide) throw Error('No slide');
      const changed = await window.prezi.edit({
        requestId: crypto.randomUUID(),
        expectedRevision: initial.value.revision,
        label: 'Add reveals',
        operations: [
          {
            type: 'updateSlide',
            slideId: slide.id,
            patch: { reveals: Array.from({ length: 30 }, (_, index) => index.toString()) },
          },
        ],
      });
      if (!changed.ok) throw Error(changed.error.message);
      return window.prezi.submitScene({
        requestId: 'validation-budget',
        expectedRevision: changed.value.revision,
        slideId: slide.id,
        label: 'Validate scene',
        candidate: {
          id: crypto.randomUUID(),
          name: 'Scene',
          fields: {},
          layers: [],
          source: {
            entry: 'Scene.tsx',
            files: {
              'Scene.tsx':
                'export default function Scene({reveal}:{reveal:number}) {return <div>{reveal}</div>}',
            },
          },
        },
        properties: {},
      });
    });
    expect(submitted.ok).toBe(true);
    await expect
      .poll(
        async () => {
          const job = await page.evaluate(() => window.prezi.sceneJob('validation-budget'));
          return job.ok && !['queued', 'compiling', 'validating'].includes(job.value.state);
        },
        { timeout: 70000 },
      )
      .toBe(true);
    expect(await page.evaluate(() => window.prezi.sceneJob('validation-budget'))).toMatchObject({
      ok: true,
      value: { state: 'complete' },
    });
    const installed = await page.evaluate(() => window.prezi.snapshot());
    if (!installed.ok) throw Error(installed.error.message);
    expect(installed.value.project.slides[0]?.scene).toBeDefined();
  } finally {
    await desktop.close();
  }
});
