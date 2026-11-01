import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { failure } from '../shared/result';
import type { Result } from '../shared/result';

export function registerPresentationIpc(window: BrowserWindow): void {
  ipcMain.handle(
    'presentation:fullscreen',
    (event, enabled: unknown): Promise<Result<boolean>> | Result<boolean> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        typeof enabled !== 'boolean'
      )
        return failure('INVALID_INPUT', 'A valid fullscreen request is required.');
      if (window.isFullScreen() === enabled) return { ok: true, value: enabled };
      return new Promise((resolve) => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        function finish(): void {
          if (timeout) clearTimeout(timeout);
          resolve({ ok: true, value: window.isFullScreen() });
        }
        timeout = setTimeout(() => {
          if (enabled) window.removeListener('enter-full-screen', finish);
          else window.removeListener('leave-full-screen', finish);
          resolve(
            failure(
              'IO_ERROR',
              'Fullscreen could not be changed. Windowed presentation remains available.',
            ),
          );
        }, 2000);
        if (enabled) window.once('enter-full-screen', finish);
        else window.once('leave-full-screen', finish);
        window.setFullScreen(enabled);
      });
    },
  );
}
