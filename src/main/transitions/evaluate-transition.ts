import { BrowserWindow } from 'electron';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import { prepareSceneFrame } from '../scenes/register-runtime';
import { transitionSamplesSchema } from '../../shared/transition-style';
import type { TransitionSamples } from '../../shared/transition-style';
import type { SceneValues } from '../../shared/scene-definition';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

const statusSchema = z.object({
  state: z.string().optional(),
  error: z.string().optional(),
  samples: z.string().max(256000).optional(),
});
async function readSamples(window: BrowserWindow): Promise<Result<TransitionSamples>> {
  const input: unknown = await window.webContents.executeJavaScript(
    "(()=>{const {state,error,samples}=document.documentElement.dataset;return {state:state?.slice(0,20),error:error?.slice(0,2000),samples:samples&&samples.length<=256000?samples:'null'};})()",
  );
  const status = statusSchema.safeParse(input);
  if (!status.success) return failure('INVALID_INPUT', 'The transition returned invalid samples.');
  if (status.data.state === 'error')
    return failure('INVALID_INPUT', status.data.error ?? 'The transition could not run.');
  if (status.data.state === 'ready' && status.data.samples) {
    const raw: unknown = JSON.parse(status.data.samples);
    const parsed = transitionSamplesSchema.safeParse(raw);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : failure('INVALID_INPUT', 'Transition samples exceed the allowed visual bounds.');
  }
  await pause(20);
  return readSamples(window);
}
export async function evaluateTransition(
  code: string,
  properties: SceneValues,
  signal: AbortSignal,
  editorPid: number,
): Promise<Result<TransitionSamples>> {
  if (signal.aborted) return failure('CANCELLED', 'Transition evaluation was cancelled.');
  const window = new BrowserWindow({
    show: false,
    width: 960,
    height: 540,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      offscreen: true,
    },
  });
  window.webContents.setAudioMuted(true);
  window.webContents.setFrameRate(30);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  let resolveStopped: (result: Result<TransitionSamples>) => void = () => undefined;
  const stopped = new Promise<Result<TransitionSamples>>((resolve) => {
    resolveStopped = resolve;
  });
  const stop = (): void => {
    if (!window.isDestroyed()) {
      window.webContents.forcefullyCrashRenderer();
      window.destroy();
    }
    resolveStopped(
      failure(
        signal.aborted ? 'CANCELLED' : 'INVALID_INPUT',
        signal.aborted
          ? 'Transition evaluation was cancelled.'
          : 'The transition exceeded its 10-second evaluation limit.',
      ),
    );
  };
  signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, 10000);
  const evaluate = async (): Promise<Result<TransitionSamples>> => {
    try {
      await window.loadURL(`prezi-scene://${crypto.randomUUID()}/index.html`);
      window.webContents.setZoomFactor(0.5);
      const prepared = await prepareSceneFrame(window.webContents.mainFrame, editorPid);
      if (!prepared.ok) return prepared;
      await window.webContents.executeJavaScript(
        `window.postMessage(${JSON.stringify({ type: 'prezi:transition', code, properties })},'*');`,
      );
      return await readSamples(window);
    } catch {
      return failure('INVALID_INPUT', 'The isolated transition evaluator could not finish.');
    }
  };
  try {
    return await Promise.race([evaluate(), stopped]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
    if (!window.isDestroyed()) window.destroy();
  }
}
