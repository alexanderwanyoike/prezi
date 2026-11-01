import type { BrowserWindow } from 'electron';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import { withIsolatedRenderer } from '../rendering/with-isolated-renderer';
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
  return withIsolatedRenderer(
    signal,
    {
      deadline: 10000,
      frameRate: 30,
      useContentSize: true,
      editorPid,
      cancelled: 'Transition evaluation was cancelled.',
      timeout: {
        code: 'INVALID_INPUT',
        message: 'The transition exceeded its 10-second evaluation limit.',
      },
      failed: {
        code: 'INVALID_INPUT',
        message: 'The isolated transition evaluator could not finish.',
      },
    },
    async (window) => {
      await window.webContents.executeJavaScript(
        `window.postMessage(${JSON.stringify({ type: 'prezi:transition', code, properties })},'*');`,
      );
      return await readSamples(window);
    },
  );
}
