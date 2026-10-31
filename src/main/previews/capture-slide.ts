import { BrowserWindow } from 'electron';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import type { Project } from '../../shared/project';
import type { PreviewImage } from '../../shared/preview';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import { prepareSceneFrame } from '../scenes/register-runtime';

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
  window.webContents.setZoomFactor(0.5);
  window.webContents.setFrameRate(30);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  let resolveStopped: (result: Result<PreviewImage>) => void = () => undefined;
  const stopped = new Promise<Result<PreviewImage>>((resolve) => {
    resolveStopped = resolve;
  });
  const stop = (): void => {
    if (!window.isDestroyed()) {
      window.webContents.forcefullyCrashRenderer();
      window.destroy();
    }
    resolveStopped(
      failure(
        signal.aborted ? 'CANCELLED' : 'IO_ERROR',
        signal.aborted
          ? 'Preview capture was cancelled.'
          : 'The preview exceeded its 10-second limit.',
      ),
    );
  };
  signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, 10000);
  const capture = async (): Promise<Result<PreviewImage>> => {
    try {
      await window.loadURL(`prezi-scene://${crypto.randomUUID()}/index.html`);
      const prepared = await prepareSceneFrame(window.webContents.mainFrame, editorPid);
      if (!prepared.ok) return prepared;
      const state = {
        theme: project.theme,
        fonts: project.fonts?.map(({ id, name, extension }) => ({ id, name, extension })),
        title: slide.title,
        body: slide.body,
        reveal,
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
    } catch {
      return failure('IO_ERROR', 'The isolated preview renderer could not finish.');
    }
  };
  try {
    return await Promise.race([capture(), stopped]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
    if (!window.isDestroyed()) window.destroy();
  }
}
