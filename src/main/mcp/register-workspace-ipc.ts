import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { failure } from '../../shared/result';
import type { WorkspaceOwner } from './workspace-owner';

export function registerWorkspaceIpc(window: BrowserWindow, workspace: WorkspaceOwner): void {
  ipcMain.handle('workspace:publish', (event, input: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted workspace request.');
    return workspace.publish(input);
  });
  const unsubscribe = workspace.subscribe((selection) => {
    if (!window.isDestroyed()) window.webContents.send('workspace:selection', selection);
  });
  window.on('closed', unsubscribe);
}
