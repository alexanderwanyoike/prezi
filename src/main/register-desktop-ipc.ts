import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { desktopShortcut, nativeEditSchema } from '../shared/desktop-commands';
import { failure } from '../shared/result';
import type { Result } from '../shared/result';

export function registerDesktopIpc(window: BrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const command = desktopShortcut({
      key: input.key,
      ctrlKey: input.control,
      metaKey: input.meta,
      altKey: input.alt,
      shiftKey: input.shift,
    });
    if (!command || command === 'undo' || command === 'redo') return;
    event.preventDefault();
    if (!input.isAutoRepeat) window.webContents.send('desktop:command', command);
  });
  ipcMain.handle('desktop:edit', (event, input: unknown): Result<boolean> => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted desktop command.');
    const command = nativeEditSchema.safeParse(input);
    if (!command.success) return failure('INVALID_INPUT', 'Unknown editing command.');
    try {
      window.webContents[command.data]();
      return { ok: true, value: true };
    } catch {
      return failure('IO_ERROR', 'The editing command could not be completed.');
    }
  });
  ipcMain.handle('desktop:close', (event): Result<boolean> => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted desktop command.');
    window.close();
    return { ok: true, value: true };
  });
}
