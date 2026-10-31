import type { Result } from '../../shared/result';
import { failure } from '../../shared/result';
import type { UpdateBackend } from './service';

export interface NativeUpdateClient {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  allowDowngrade: boolean;
  on(event: 'download-progress', listener: (input: { percent: number }) => void): unknown;
  on(event: 'error', listener: () => void): unknown;
  once(event: 'error', listener: () => void): unknown;
  removeListener(event: 'error', listener: () => void): unknown;
  checkForUpdates: () => Promise<{ updateInfo: { version: string } } | null>;
  downloadUpdate: () => Promise<string[]>;
  quitAndInstall: (silent?: boolean, runAfter?: boolean) => void;
}
interface Options {
  createClient: () => NativeUpdateClient;
  readRelease: () => Promise<Result<string | null>>;
  installVerified: (path: string, client: NativeUpdateClient) => Promise<Result<void>>;
}
export function createNativeBackend(options: Options): UpdateBackend {
  let client: NativeUpdateClient | undefined;
  let downloaded: string | null = null;
  let reportProgress: ((percent: number) => void) | undefined;
  function getClient(): NativeUpdateClient {
    if (!client) {
      client = options.createClient();
      client.autoDownload = false;
      client.autoInstallOnAppQuit = false;
      client.allowPrerelease = false;
      client.allowDowngrade = false;
      client.on('error', () => {
        downloaded = null;
      });
      client.on('download-progress', ({ percent }) => {
        reportProgress?.(percent);
      });
    }
    return client;
  }
  return {
    automatic: true,
    check: options.readRelease,
    async download(version, progress) {
      downloaded = null;
      reportProgress = progress;
      try {
        const updater = getClient();
        const available = await updater.checkForUpdates();
        if (available?.updateInfo.version !== version)
          return failure('CONFLICT', 'The release changed. Check for updates again.');
        const paths = await updater.downloadUpdate();
        if (paths.length !== 1 || !paths[0])
          return failure('IO_ERROR', 'The download did not produce a verified installer.');
        [downloaded] = paths;
        return { ok: true, value: undefined };
      } catch {
        return failure(
          'IO_ERROR',
          'The update could not be downloaded and verified. Please retry.',
        );
      } finally {
        reportProgress = undefined;
      }
    },
    async install() {
      if (!client || !downloaded)
        return failure('INVALID_INPUT', 'Download and verify the update before installing.');
      try {
        return await options.installVerified(downloaded, client);
      } catch {
        return failure('IO_ERROR', 'The installer could not start. Please retry.');
      }
    },
  };
}
