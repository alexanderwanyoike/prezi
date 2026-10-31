import { app, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import type { createUpdateService } from './service';

export function registerUpdateIpc(
  window: BrowserWindow,
  updates: ReturnType<typeof createUpdateService>,
  prepare: () => Promise<Result<() => void>>,
): void {
  (['status', 'check', 'download', 'install'] as const).forEach((command) => {
    ipcMain.handle(`updates:${command}`, async (event) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
        return failure('INVALID_INPUT', 'Untrusted update request.');
      try {
        let result;
        if (command === 'status') result = { ok: true as const, value: updates.status() };
        else if (command === 'install') result = await updates.install(prepare);
        else result = await updates[command]();
        return result.ok
          ? { ok: true, value: { installedVersion: app.getVersion(), state: result.value } }
          : result;
      } catch {
        return failure('IO_ERROR', 'The update operation could not finish. Please retry.');
      }
    });
  });
  const unsubscribe = updates.subscribe((state) => {
    if (!window.isDestroyed())
      window.webContents.send('updates:changed', { installedVersion: app.getVersion(), state });
  });
  window.on('closed', unsubscribe);
}
