import { app, autoUpdater, dialog } from 'electron';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import type { NativeUpdateClient } from './native-backend';
import { replaceAppImage } from './replace-appimage';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function installVerified(
  path: string,
  client: NativeUpdateClient,
): Promise<Result<void>> {
  if (process.platform === 'linux' && process.env.APPIMAGE) {
    const file = process.env.APPIMAGE;
    const replaced = await replaceAppImage(file, path);
    if (!replaced.ok) return replaced;
    // The relaunch helper belongs to the old mount and may disappear during quit.
    app.once('will-quit', () => {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) =>
            ![
              'APPIMAGE',
              'APPDIR',
              'ARGV0',
              'OWD',
              'APPIMAGE_EXIT_AFTER_INSTALL',
              'ELECTRON_RUN_AS_NODE',
            ].includes(key),
        ),
      );
      try {
        const child = spawn(file, process.argv.slice(1), {
          cwd: dirname(file),
          env,
          detached: true,
          stdio: 'ignore',
        });
        child.once('error', () => {
          process.stderr.write(`Prezi could not restart. Open ${file} to continue.\n`);
        });
        child.unref();
      } catch {
        dialog.showErrorBox('Prezi could not restart', `Open ${file} to use the installed update.`);
      }
    });
    app.quit();
    return { ok: true, value: undefined };
  }
  return new Promise((resolve) => {
    const active: {
      timer?: ReturnType<typeof setTimeout>;
      ready?: () => void;
      failed?: () => void;
    } = {};
    const finish = (result: Result<void>): void => {
      if (active.timer) clearTimeout(active.timer);
      if (active.ready) autoUpdater.removeListener('before-quit-for-update', active.ready);
      if (active.failed) client.removeListener('error', active.failed);
      resolve(result);
    };
    active.ready = () => {
      finish({ ok: true, value: undefined });
    };
    active.failed = () => {
      finish(failure('IO_ERROR', 'The installer could not start. Please retry.'));
    };
    active.timer = setTimeout(active.failed, 10000);
    autoUpdater.once('before-quit-for-update', active.ready);
    client.once('error', active.failed);
    try {
      client.quitAndInstall(true, true);
    } catch {
      active.failed();
    }
  });
}
