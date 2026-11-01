import { BrowserWindow } from 'electron';
import type { AppError, Result } from '../../shared/result';
import { failure } from '../../shared/result';
import { prepareSceneFrame } from '../scenes/register-runtime';

interface Options {
  deadline: number;
  frameRate: 30 | 60;
  useContentSize?: boolean;
  editorPid: number;
  cancelled: string;
  timeout: AppError;
  failed: AppError;
}

export async function withIsolatedRenderer<T>(
  signal: AbortSignal,
  options: Options,
  work: (window: BrowserWindow) => Promise<Result<T>>,
): Promise<Result<T>> {
  if (signal.aborted) return failure('CANCELLED', options.cancelled);
  const window = new BrowserWindow({
    show: false,
    width: 960,
    height: 540,
    useContentSize: options.useContentSize ?? false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      offscreen: true,
    },
  });
  window.webContents.setAudioMuted(true);
  window.webContents.setFrameRate(options.frameRate);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  let resolveStopped: (result: Result<T>) => void = () => undefined;
  const stopped = new Promise<Result<T>>((resolve) => {
    resolveStopped = resolve;
  });
  const stop = (): void => {
    if (!window.isDestroyed()) {
      window.webContents.forcefullyCrashRenderer();
      window.destroy();
    }
    resolveStopped(
      signal.aborted
        ? failure('CANCELLED', options.cancelled)
        : { ok: false, error: options.timeout },
    );
  };
  signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, options.deadline);
  const run = async (): Promise<Result<T>> => {
    await window.loadURL(`prezi-scene://${crypto.randomUUID()}/index.html`);
    window.webContents.setZoomFactor(0.5);
    const prepared = await prepareSceneFrame(window.webContents.mainFrame, options.editorPid);
    if (!prepared.ok) return prepared;
    return work(window);
  };
  try {
    return await Promise.race([run(), stopped]);
  } catch {
    return { ok: false, error: options.failed };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
    if (!window.isDestroyed()) window.destroy();
  }
}
