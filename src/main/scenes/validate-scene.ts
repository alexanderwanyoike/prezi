import { BrowserWindow } from 'electron';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import type { ProjectFont } from '../../shared/fonts';
import type { PresentationTheme } from '../../shared/presentation-theme';
import { prepareSceneFrame } from './register-runtime';
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
  const window = new BrowserWindow({
    show: false,
    width: 960,
    height: 540,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      offscreen: true,
    },
  });
  window.webContents.setAudioMuted(true);
  window.webContents.setFrameRate(60);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  let resolveCancelled: (result: Result<void>) => void = () => undefined;
  const cancelled = new Promise<Result<void>>((resolve) => {
    resolveCancelled = resolve;
  });
  const stop = (): void => {
    if (!window.isDestroyed()) {
      window.webContents.forcefullyCrashRenderer();
      window.destroy();
    }
    resolveCancelled(
      failure(
        signal.aborted ? 'CANCELLED' : 'INVALID_INPUT',
        signal.aborted
          ? 'Scene validation was cancelled.'
          : `The scene exceeded its ${(deadline / 1000).toString()}-second validation limit.`,
      ),
    );
  };
  signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, deadline);
  const work = async (): Promise<Result<void>> => {
    try {
      await window.loadURL(`prezi-scene://${crypto.randomUUID()}/index.html`);
      window.webContents.setZoomFactor(0.5);
      const prepared = await prepareSceneFrame(window.webContents.mainFrame, editorPid);
      if (!prepared.ok) return prepared;
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
    } catch {
      return failure('INVALID_INPUT', 'The scene renderer could not complete validation.');
    }
  };
  try {
    return await Promise.race([work(), cancelled]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
    if (!window.isDestroyed()) window.destroy();
  }
}
