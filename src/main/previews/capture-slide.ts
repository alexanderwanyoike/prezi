import type { BrowserWindow } from 'electron';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import type { Project } from '../../shared/project';
import type { PreviewImage } from '../../shared/preview';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import { withIsolatedRenderer } from '../rendering/with-isolated-renderer';

const readiness = z.object({
  state: z.string().optional(),
  error: z.string().optional(),
  assets: z.boolean(),
});
async function waitForImage(window: BrowserWindow): Promise<Result<void>> {
  const input: unknown = await window.webContents.executeJavaScript(
    `({state:document.documentElement.dataset.state,error:document.documentElement.dataset.error,assets:document.fonts.status==='loaded'&&[...document.images].every(image=>image.complete)&&[...document.querySelectorAll('video')].every(video=>video.readyState>=2||video.error!==null)})`,
  );
  const status = readiness.safeParse(input);
  if (!status.success)
    return failure('IO_ERROR', 'The preview renderer returned an invalid status.');
  if (status.data.state === 'error')
    return failure('INVALID_INPUT', status.data.error ?? 'The preview could not render.');
  if (status.data.state === 'ready' && status.data.assets) return { ok: true, value: undefined };
  await pause(30);
  return waitForImage(window);
}

export async function captureSlide(
  project: Project,
  slideId: string,
  reveal: number,
  signal: AbortSignal,
  editorPid: number,
): Promise<Result<PreviewImage>> {
  if (signal.aborted) return failure('CANCELLED', 'Preview capture was cancelled.');
  const slide = project.slides.find((item) => item.id === slideId);
  if (!slide) return failure('NOT_FOUND', 'The slide no longer exists.');
  return withIsolatedRenderer(
    signal,
    {
      deadline: 10000,
      frameRate: 30,
      useContentSize: true,
      editorPid,
      cancelled: 'Preview capture was cancelled.',
      timeout: { code: 'IO_ERROR', message: 'The preview exceeded its 10-second limit.' },
      failed: { code: 'IO_ERROR', message: 'The isolated preview renderer could not finish.' },
    },
    async (window) => {
      const state = {
        theme: project.theme,
        fonts: project.fonts?.map(({ id, name, extension }) => ({ id, name, extension })),
        title: slide.title,
        body: slide.body,
        reveal,
        reveals: slide.reveals,
        probeFrame: 11,
        properties: slide.scene?.properties ?? {},
        media: slide.media ?? null,
        editing: false,
        pending: false,
        active: false,
        autoplay: false,
        selectedLayer: null,
      };
      const definition = project.scenes?.[slide.scene?.definitionId ?? ''];
      const message = definition
        ? { type: 'prezi:load', code: definition.code, definition, state }
        : {
            type: 'prezi:preset',
            slide,
            slideNumber: project.slides.findIndex((item) => item.id === slide.id) + 1,
            slideCount: project.slides.length,
            state,
          };
      await window.webContents.executeJavaScript(
        `window.postMessage(${JSON.stringify(message)},'*');`,
      );
      const ready = await waitForImage(window);
      if (!ready.ok) return ready;
      const native = await window.webContents.capturePage(undefined, {
        stayHidden: true,
        stayAwake: true,
      });
      const image = native.resize({ width: 960, height: 540, quality: 'good' });
      if (image.isEmpty())
        return failure('IO_ERROR', 'The preview renderer returned an empty image.');
      const bytes = image.toJPEG(75);
      if (bytes.length > 1024 * 1024)
        return failure('IO_ERROR', 'The preview exceeded its one MiB image limit.');
      return {
        ok: true,
        value: {
          dataUrl: `data:image/jpeg;base64,${bytes.toString('base64')}`,
          width: 960,
          height: 540,
        },
      };
    },
  );
}
