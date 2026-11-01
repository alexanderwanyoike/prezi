import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { installVerified } from './restart';
import type { NativeUpdateClient } from './native-backend';

const fixtures = vi.hoisted(() => ({
  spawn: vi.fn<(...args: unknown[]) => { once: () => void; unref: () => void }>(() => ({
    once: () => undefined,
    unref: () => undefined,
  })),
}));
vi.mock('electron', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  const app = Object.assign(new Emitter(), { quit: vi.fn() });
  return { app, autoUpdater: new Emitter(), dialog: { showErrorBox: vi.fn() } };
});
vi.mock('node:child_process', () => ({ spawn: fixtures.spawn }));
vi.mock('./replace-appimage', () => ({
  replaceAppImage: () => Promise.resolve({ ok: true, value: undefined }),
}));

it.skipIf(process.platform !== 'linux')(
  'starts the replacement only after shutdown cleanup reaches quit',
  async () => {
    vi.stubEnv('APPIMAGE', '/private/Prezi.AppImage');
    const emitter = new EventEmitter();
    const client: NativeUpdateClient = {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      allowPrerelease: false,
      allowDowngrade: false,
      on: emitter.on.bind(emitter),
      once: emitter.once.bind(emitter),
      removeListener: emitter.removeListener.bind(emitter),
      checkForUpdates: () => Promise.resolve(null),
      downloadUpdate: () => Promise.resolve([]),
      quitAndInstall: () => undefined,
    };
    try {
      const { app } = await import('electron');
      expect((await installVerified('/private/update.AppImage', client)).ok).toBe(true);
      app.emit('will-quit');
      expect(fixtures.spawn).not.toHaveBeenCalled();
      app.emit('quit', {}, 0);
      expect(fixtures.spawn).toHaveBeenCalledTimes(1);
      expect(fixtures.spawn.mock.calls[0]?.[0]).toBe('/private/Prezi.AppImage');
    } finally {
      vi.unstubAllEnvs();
    }
  },
);
