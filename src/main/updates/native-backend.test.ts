import { EventEmitter } from 'node:events';
import { expect, test } from 'vitest';
import { createNativeBackend } from './native-backend';
import type { NativeUpdateClient } from './native-backend';

test('rejects a changed release and installs only the verified download without automatic quit installs', async () => {
  const emitter = new EventEmitter();
  let version = '0.3.0';
  let downloads = 0;
  let installed: string | null = null;
  const client: NativeUpdateClient = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: true,
    allowDowngrade: true,
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
    checkForUpdates: () => Promise.resolve({ updateInfo: { version } }),
    downloadUpdate: () => {
      downloads += 1;
      return Promise.resolve(['/verified/update.AppImage']);
    },
    quitAndInstall: () => undefined,
  };
  const backend = createNativeBackend({
    createClient: () => client,
    readRelease: () => Promise.resolve({ ok: true, value: '0.2.0' }),
    installVerified: (path) => {
      installed = path;
      return Promise.resolve({ ok: true, value: undefined });
    },
  });
  expect((await backend.download('0.2.0', () => undefined)).ok).toBe(false);
  expect(downloads).toBe(0);
  expect((await backend.install()).ok).toBe(false);
  version = '0.2.0';
  expect((await backend.download('0.2.0', () => undefined)).ok).toBe(true);
  expect(client).toMatchObject({
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    allowDowngrade: false,
  });
  expect((await backend.install()).ok).toBe(true);
  expect(installed).toBe('/verified/update.AppImage');
});
