import { _electron as electron, expect, test } from '@playwright/test';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { openExample } from './open-example';

const summarySchema = z.object({
  result: z.object({
    ok: z.literal(true),
    value: z.object({
      revision: z.number(),
      undoLabel: z.string().nullable(),
      project: z.object({
        id: z.uuid(),
        name: z.string(),
        slides: z.array(z.object({ id: z.uuid(), title: z.string() })),
      }),
    }),
  }),
});

test('shares revisioned MCP edits and retry-safe undo with the live Electron editor', async () => {
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
  const client = new Client({ name: 'prezi-electron-test', version: '1.0.0' });
  try {
    await desktop.evaluate(({ dialog }) =>
      Object.assign(dialog, {
        showMessageBox: () => Promise.resolve({ response: 1, checkboxChecked: false }),
      }),
    );
    await openExample(desktop);
    const page = await desktop.firstWindow();
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .fill('A manual opening');
    const path = resolve(profile, 'mcp-connection.json');
    await expect
      .poll(() =>
        access(path)
          .then(() => true)
          .catch(() => false),
      )
      .toBe(true);
    const input: unknown = JSON.parse(await readFile(path, 'utf8'));
    const connection = z.object({ url: z.url(), token: z.string().min(32) }).parse(input);
    const headers = { Authorization: `Bearer ${connection.token}` };
    expect((await fetch(connection.url, { method: 'POST' })).status).toBe(401);
    expect(
      (
        await fetch(connection.url, {
          method: 'POST',
          headers: { ...headers, Origin: 'https://example.com' },
        })
      ).status,
    ).toBe(403);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(connection.url), { requestInit: { headers } }),
    );
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Agent connection…', exact: true }),
    ).toBeVisible();
    await page.getByRole('menuitem', { name: 'Agent connection…', exact: true }).click();
    const connectionDialog = page.getByRole('dialog', { name: 'Agent connection', exact: true });
    await expect(connectionDialog).toContainText(connection.url);
    await page.getByRole('button', { name: 'Copy connection configuration', exact: true }).click();
    const copied: unknown = JSON.parse(
      await desktop.evaluate(({ clipboard }) => clipboard.readText()),
    );
    const config = z
      .object({
        mcpServers: z.object({
          prezi: z.object({ url: z.string(), headers: z.object({ Authorization: z.string() }) }),
        }),
      })
      .parse(copied);
    expect(config.mcpServers.prezi.url).toBe(connection.url);
    expect(config.mcpServers.prezi.headers.Authorization === headers.Authorization).toBe(true);
    await page.keyboard.press('Escape');
    await expect(connectionDialog).toHaveCount(0);
    const before = summarySchema.parse(
      (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
    ).result.value;
    expect(before.project.slides[0]?.title).toBe('A manual opening');
    const second = before.project.slides[1];
    if (!second) throw new Error('Missing second slide');
    await page.getByRole('button', { name: `Slide 2: ${second.title}`, exact: true }).click();
    await page.getByRole('textbox', { name: 'Canvas body', exact: true }).focus();
    await expect
      .poll(
        async () => (await client.callTool({ name: 'read_view', arguments: {} })).structuredContent,
      )
      .toMatchObject({
        result: {
          ok: true,
          value: {
            selection: { slideId: second.id, elementId: `${second.id}:body` },
            presentation: null,
          },
        },
      });
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const stage = page.getByRole('region', { name: 'Presentation stage' });
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Next reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-slide', '2');
    await expect(stage).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Next reveal', exact: true }).click();
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await expect
      .poll(
        async () => (await client.callTool({ name: 'read_view', arguments: {} })).structuredContent,
      )
      .toMatchObject({
        result: { ok: true, value: { presentation: { slideId: second.id, reveal: 1 } } },
      });
    await client.callTool({
      name: 'edit_project',
      arguments: {
        requestId: 'unrelated',
        expectedRevision: before.revision,
        label: 'Revise another slide',
        operations: [
          {
            type: 'updateSlide',
            slideId: before.project.slides[2]?.id,
            patch: { title: 'Unrelated change' },
          },
        ],
      },
    });
    await expect(stage).toHaveAttribute('data-slide', '2');
    await expect(stage).toHaveAttribute('data-reveal', '1');
    await page.keyboard.press('Escape');
    const firstId = before.project.slides[0]?.id;
    await client.callTool({
      name: 'select_element',
      arguments: { slideId: firstId, elementId: `${firstId ?? ''}:heading` },
    });
    await expect(
      page.getByRole('button', { name: 'Slide 1: A manual opening', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    const current = summarySchema.parse(
      (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
    ).result.value;
    const readSlide = await client.callTool({
      name: 'read_slide',
      arguments: { slideId: before.project.slides[0]?.id },
    });
    expect(readSlide.structuredContent).toMatchObject({
      result: { ok: true, value: { slide: { title: 'A manual opening' } } },
    });
    const source = await client.callTool({
      name: 'read_source',
      arguments: { path: 'renderer/presentation/SlideScene.tsx', offset: 0, length: 200 },
    });
    const sourceData = z
      .object({
        result: z.object({
          ok: z.literal(true),
          value: z.object({ text: z.string(), totalLength: z.number() }),
        }),
      })
      .parse(source.structuredContent).result.value;
    expect(sourceData.text).toHaveLength(200);
    expect(sourceData.totalLength).toBeGreaterThan(200);
    expect(
      (await client.callTool({ name: 'read_source', arguments: { path: '../../etc/passwd' } }))
        .structuredContent,
    ).toMatchObject({ result: { ok: false, error: { code: 'NOT_FOUND' } } });
    const slideId = before.project.slides[0]?.id;
    if (!slideId) throw new Error('Missing opening slide');
    const request = {
      requestId: 'agent-opening',
      expectedRevision: current.revision,
      label: 'Revise opening',
      operations: [
        {
          type: 'updateSlide',
          slideId,
          patch: { title: 'An agent opening', body: 'Two properties, one reversible batch.' },
        },
      ],
    };
    const after = summarySchema.parse(
      (await client.callTool({ name: 'edit_project', arguments: request })).structuredContent,
    ).result.value;
    expect(after.undoLabel).toBe('Agent: Revise opening');
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('An agent opening');
    const retry = summarySchema.parse(
      (await client.callTool({ name: 'edit_project', arguments: request })).structuredContent,
    ).result.value;
    expect(retry.revision).toBe(after.revision);
    const stale = await client.callTool({
      name: 'edit_project',
      arguments: { ...request, requestId: 'stale' },
    });
    expect(stale.structuredContent).toMatchObject({
      result: { ok: false, error: { code: 'CONFLICT' } },
    });
    const invalid = await client.callTool({
      name: 'edit_project',
      arguments: {
        ...request,
        requestId: 'atomic',
        expectedRevision: after.revision,
        operations: [...request.operations, { type: 'deleteSlide', slideId: crypto.randomUUID() }],
      },
    });
    expect(invalid.structuredContent).toMatchObject({
      result: { ok: false, error: { code: 'NOT_FOUND' } },
    });
    const undo = { requestId: 'undo-agent', expectedRevision: after.revision };
    const undone = summarySchema.parse(
      (await client.callTool({ name: 'undo', arguments: undo })).structuredContent,
    ).result.value;
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('A manual opening');
    expect(
      summarySchema.parse(
        (await client.callTool({ name: 'undo', arguments: undo })).structuredContent,
      ).result.value.revision,
    ).toBe(undone.revision);
    await client.callTool({
      name: 'redo',
      arguments: { requestId: 'redo-agent', expectedRevision: undone.revision },
    });
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('An agent opening');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(
      summarySchema.parse(
        (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
      ).result.value.project.slides[0]?.title,
    ).toBe('A manual opening');
    const importingRevision = summarySchema.parse(
      (await client.callTool({ name: 'read_project', arguments: {} })).structuredContent,
    ).result.value.revision;
    const registration = {
      requestId: 'video-fixture',
      expectedRevision: importingRevision,
      slideId,
      path: resolve('tests/fixtures/held-video.webm'),
    };
    const imported = summarySchema.parse(
      (await client.callTool({ name: 'import_media', arguments: registration })).structuredContent,
    ).result.value;
    expect(
      summarySchema.parse(
        (await client.callTool({ name: 'import_media', arguments: registration }))
          .structuredContent,
      ).result.value.revision,
    ).toBe(imported.revision);
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const heldVideo = stage.locator('video');
    await expect
      .poll(() => heldVideo.evaluate((node: HTMLVideoElement) => node.currentTime))
      .toBeGreaterThan(0.5);
    const handle = await heldVideo.elementHandle();
    await client.callTool({
      name: 'edit_project',
      arguments: {
        requestId: 'unrelated-during-video',
        expectedRevision: imported.revision,
        label: 'Keep presentation running',
        operations: [
          { type: 'updateSlide', slideId: second.id, patch: { title: 'An unrelated slide' } },
        ],
      },
    });
    expect(
      await handle.evaluate(
        (node: HTMLVideoElement) => node.isConnected && !node.paused && node.currentTime > 0.5,
      ),
    ).toBe(true);
    await expect(stage).toHaveAttribute('data-slide', '1');
    await expect(stage).toHaveAttribute('data-reveal', '0');
  } finally {
    await client.close();
    await desktop.close();
  }
});
