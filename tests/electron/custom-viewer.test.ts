import { _electron as electron, expect, test } from '@playwright/test';
import { z } from 'zod';
import { resolve } from 'node:path';
import { sceneJobResultSchema } from '../../src/shared/scene-jobs';
import { connectDesktopMcp } from './mcp-client';

test('edits an agent-authored scene in the viewer and inspector with shared undo and presentation navigation', async () => {
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
    const slide = initial.value.project.slides[0];
    if (!slide) throw Error('No slide');
    const candidate = {
      id: crypto.randomUUID(),
      name: 'Editable explanation',
      fields: {
        headline: { type: 'text', label: 'Heading', default: 'Initial custom scene' },
        size: { type: 'number', label: 'Type size', default: 80, min: 20, max: 160 },
        broken: { type: 'boolean', label: 'Break scene', default: false },
      },
      layers: [{ id: 'hero', label: 'Heading', property: 'headline' }],
      source: {
        entry: 'Scene.tsx',
        files: {
          'Scene.tsx': `import {AbsoluteFill,useCurrentFrame} from 'remotion';import {Layer,Text} from 'prezi';import type {SceneProps} from 'prezi';export default function Scene({props}:SceneProps){if(props.broken)throw new Error("Scene needs Undo");return <AbsoluteFill style={{background:'#101513',color:'#edf2ec',padding:128,fontSize:props.size}}><Layer id="hero"><Text property="headline"/></Layer><span id="frame">{useCurrentFrame()}</span></AbsoluteFill>;}`,
        },
      },
    };
    await client.callTool({
      name: 'compile_scene',
      arguments: {
        requestId: 'viewer-source',
        expectedRevision: 0,
        label: 'Build editable scene',
        slideId: slide.id,
        candidate,
        properties: { headline: 'Initial custom scene' },
      },
    });
    await expect
      .poll(
        async () => {
          const job = z
            .object({ result: sceneJobResultSchema })
            .parse(
              (await client.callTool({ name: 'read_job', arguments: { jobId: 'viewer-source' } }))
                .structuredContent,
            );
          return job.result.ok ? job.result.value.state : 'failed';
        },
        { timeout: 15000 },
      )
      .toBe('complete');
    const child = page.frameLocator('iframe[title="Custom scene"]');
    const heading = child.getByRole('textbox', { name: 'Canvas heading', exact: true });
    await expect(heading).toHaveText('Initial custom scene');
    await expect(child.locator('#frame')).toHaveText('11');
    await heading.fill('Edited on the stage');
    await expect(page.getByRole('textbox', { name: 'Heading', exact: true })).toHaveValue(
      'Edited on the stage',
    );
    expect(
      (await client.callTool({ name: 'read_view', arguments: {} })).structuredContent,
    ).toMatchObject({
      result: {
        ok: true,
        value: { selection: { slideId: slide.id, elementId: `${slide.id}:hero` } },
      },
    });
    await client.callTool({
      name: 'edit_project',
      arguments: {
        requestId: 'viewer-agent',
        expectedRevision: 2,
        label: 'Update selected heading',
        operations: [
          {
            type: 'updateSceneProperties',
            slideId: slide.id,
            patch: { headline: 'Agent edit while focused' },
          },
        ],
      },
    });
    await expect(heading).toHaveText('Agent edit while focused');
    await expect(child.locator('#frame')).toHaveText('11');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(heading).toHaveText('Edited on the stage');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(heading).toHaveText('Initial custom scene');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(heading).toHaveText('Initial custom scene');
    await client.callTool({
      name: 'edit_project',
      arguments: {
        requestId: 'break-scene',
        expectedRevision: 7,
        label: 'An incorrect property edit',
        operations: [{ type: 'updateSceneProperties', slideId: slide.id, patch: { broken: true } }],
      },
    });
    await expect(page.getByRole('alert').filter({ hasText: 'Scene needs Undo' })).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(heading).toHaveText('Initial custom scene');
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await expect(child.getByText('Initial custom scene', { exact: true })).toBeVisible();
    await page.locator('iframe[title="Custom scene"]').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('Space');
    await expect(stage).toHaveAttribute('data-slide', '2');
    await page.keyboard.press('Escape');
  } finally {
    await client.close();
    await desktop.close();
  }
});
