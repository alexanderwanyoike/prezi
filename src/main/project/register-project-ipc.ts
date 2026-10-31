import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { z } from 'zod';
import { failure } from '../../shared/result';
import type { ProjectSnapshot } from '../../shared/project';
import type { Result } from '../../shared/result';
import type { ProjectOwner } from './project-owner';

export function registerProjectIpc(window: BrowserWindow, owner: ProjectOwner): void {
  function handle(channel: string, run: (input: unknown) => Result<ProjectSnapshot>): void {
    ipcMain.handle(channel, (event, input: unknown) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
        return failure('INVALID_INPUT', 'Untrusted project request.');
      return run(input);
    });
  }
  handle('project:snapshot', () => ({ ok: true, value: owner.snapshot() }));
  handle('project:edit', (input) => owner.edit(input));
  (['undo', 'redo'] as const).forEach((action) => {
    handle(`project:${action}`, (input) => {
      const revision = z.number().int().nonnegative().safeParse(input);
      return revision.success
        ? owner[action](revision.data)
        : failure('INVALID_INPUT', 'A valid project revision is required.');
    });
  });
  window.on('page-title-updated', (event) => {
    event.preventDefault();
  });
  function updateTitle(snapshot: ProjectSnapshot): void {
    window.setTitle(`${snapshot.project.name}${snapshot.dirty ? ' *' : ''} - Prezi`);
    if (process.platform === 'darwin') {
      window.setDocumentEdited(snapshot.dirty);
      window.setRepresentedFilename(snapshot.filePath ?? '');
    }
  }
  updateTitle(owner.snapshot());
  const unsubscribe = owner.subscribe((snapshot) => {
    if (!window.isDestroyed()) updateTitle(snapshot);
    if (!window.isDestroyed()) window.webContents.send('project:changed', snapshot);
  });
  window.on('closed', unsubscribe);
}
