import type { BrowserWindow } from 'electron';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import type { ProjectFont } from '../../shared/fonts';
import type { PresentationTheme } from '../../shared/presentation-theme';
import { withIsolatedRenderer } from '../rendering/with-isolated-renderer';
import type { SceneJobRequest } from '../../shared/scene-jobs';
import type { Slide } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

async function waitForScene(window: BrowserWindow, remaining = 150): Promise<Result<void>> {
  const input: unknown = await window.webContents.executeJavaScript(
    '({state:document.documentElement.dataset.state,error:document.documentElement.dataset.error})',
  );
  const status = z
    .object({ state: z.string().optional(), error: z.string().optional() })
    .parse(input);
  if (status.state === 'error')
    return failure('INVALID_INPUT', status.error ?? 'The scene could not render.');
  if (status.state === 'ready') return { ok: true, value: undefined };
  if (remaining === 0) return failure('INVALID_INPUT', 'The scene did not render in time.');
  await pause(20);
  return waitForScene(window, remaining - 1);
}
export async function validateScene(
  request: SceneJobRequest,
  code: string,
  slide: Slide,
  signal: AbortSignal,
  editorPid: number,
  theme?: PresentationTheme,
  fonts?: ProjectFont[],
): Promise<Result<void>> {
  if (signal.aborted) return failure('CANCELLED', 'Scene validation was cancelled.');
  const deadline = 20000 + (slide.reveals.length + 1) * 12 * 100;
  return withIsolatedRenderer(
    signal,
    {
      deadline,
      frameRate: 60,
      useContentSize: false,
      editorPid,
      cancelled: 'Scene validation was cancelled.',
      timeout: {
        code: 'INVALID_INPUT',
        message: `The scene exceeded its ${(deadline / 1000).toString()}-second validation limit.`,
      },
      failed: {
        code: 'INVALID_INPUT',
        message: 'The scene renderer could not complete validation.',
      },
    },
    async (window) => {
      const state = {
        theme,
        fonts: fonts?.map(({ id, name, extension }) => ({ id, name, extension })),
        title: slide.title,
        body: slide.body,
        reveal: 0,
        reveals: slide.reveals,
        probeFrame: 0,
        properties: request.properties,
        media: slide.media ?? null,
        editing: false,
        pending: false,
        active: false,
        autoplay: false,
        selectedLayer: null,
      };
      await window.webContents.executeJavaScript(
        `document.documentElement.dataset.state='waiting';window.postMessage(${JSON.stringify({ type: 'prezi:load', code, definition: { id: request.candidate.id, name: request.candidate.name, fields: request.candidate.fields, layers: request.candidate.layers }, state })},'*');`,
      );
      const initial = await waitForScene(window);
      if (!initial.ok) return initial;
      const probe = async (reveal: number, frame: number): Promise<Result<void>> => {
        await window.webContents.executeJavaScript(
          `document.documentElement.dataset.state='waiting';window.postMessage(${JSON.stringify({ type: 'prezi:update', state: { ...state, reveal, probeFrame: frame } })},'*');`,
        );
        const checked = await waitForScene(window);
        if (!checked.ok) return checked;
        if (frame < 11) return probe(reveal, frame + 1);
        if (reveal < slide.reveals.length) return probe(reveal + 1, 0);
        return { ok: true, value: undefined };
      };
      return await probe(0, 1);
    },
  );
}
