import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { failure } from '../../shared/result';
import type { PreviewJobs } from './preview-jobs';

export function registerPreviewIpc(window: BrowserWindow, jobs: PreviewJobs): void {
  ipcMain.handle('previews:submit', (event, input: unknown) =>
    event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame
      ? jobs.submit(input)
      : failure('INVALID_INPUT', 'Untrusted preview request.'),
  );
  ipcMain.handle('previews:list', (event) =>
    event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame
      ? { ok: true, value: jobs.list() }
      : failure('INVALID_INPUT', 'Untrusted preview request.'),
  );
  ipcMain.handle('previews:cancel', (event, input: unknown) =>
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    typeof input === 'string'
      ? jobs.cancel(input)
      : failure('INVALID_INPUT', 'Untrusted preview request.'),
  );
  const unsubscribe = jobs.subscribe((job) => {
    if (!window.isDestroyed()) window.webContents.send('previews:changed', job);
  });
  window.on('closed', unsubscribe);
}
