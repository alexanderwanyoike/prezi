import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import semver from 'semver';
import { failure } from '../../shared/result';
import { latestRelease, RELEASES_URL } from './latest-release';
import { createNativeBackend } from './native-backend';
import { installVerified } from './restart';
import { createUpdateService } from './service';
import type { UpdateBackend } from './service';

export function createInstalledUpdates() {
  const automatic =
    process.platform === 'win32' || (process.platform === 'linux' && !!process.env.APPIMAGE);
  const check = () => latestRelease(fetch, app.getVersion(), process.platform, process.arch);
  const backend: UpdateBackend = automatic
    ? createNativeBackend({
        createClient: () => electronUpdater.autoUpdater,
        readRelease: check,
        installVerified,
      })
    : {
        automatic: false,
        check,
        async download(version) {
          if (!semver.valid(version) || semver.prerelease(version))
            return failure('INVALID_INPUT', 'The update version is invalid.');
          try {
            await shell.openExternal(`${RELEASES_URL}/tag/v${version}`);
            return { ok: true, value: undefined };
          } catch {
            return failure('IO_ERROR', 'The release page could not open. Please retry.');
          }
        },
        install: () =>
          Promise.resolve(
            failure('INVALID_INPUT', 'Open the platform installer from the release page.'),
          ),
      };
  const updates = createUpdateService(app.isPackaged ? backend : undefined);
  let delayed: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const checkQuietly = (): void => {
    void updates.check().then((result) => {
      if (!result.ok && result.error.code !== 'CONFLICT')
        process.stderr.write(`${result.error.message}\n`);
    });
  };
  return {
    updates,
    start() {
      if (!app.isPackaged || interval) return;
      delayed = setTimeout(checkQuietly, 30000);
      delayed.unref();
      interval = setInterval(checkQuietly, 6 * 60 * 60 * 1000);
      interval.unref();
    },
    stop() {
      clearTimeout(delayed);
      clearInterval(interval);
    },
  };
}
