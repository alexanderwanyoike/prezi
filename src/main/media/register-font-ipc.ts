import { dialog, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { ProjectOwner } from '../project/project-owner';
import { failure } from '../../shared/result';

export function registerFontIpc(window: BrowserWindow, owner: ProjectOwner): void {
  ipcMain.handle('project:importFont', async (event) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted font request.');
    const { revision } = owner.snapshot();
    try {
      const chosen = await dialog.showOpenDialog(window, {
        title: 'Import font',
        properties: ['openFile'],
        filters: [{ name: 'Local fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
      });
      const path = chosen.filePaths[0];
      if (chosen.canceled || !path) return failure('CANCELLED', 'Font import was cancelled.');
      return await owner.importFont(path, revision);
    } catch {
      return failure('IO_ERROR', 'The font file dialog could not be opened.');
    }
  });
}
