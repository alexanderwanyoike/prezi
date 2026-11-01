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
  ipcMain.handle('project:sources', (event, input: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted source request.');
    const id = z.uuid().safeParse(input);
    if (!id.success) return failure('INVALID_INPUT', 'A valid source catalog ID is required.');
    const catalog = owner.sourceCatalog();
    return catalog.id === id.data
      ? { ok: true, value: catalog }
      : failure('CONFLICT', 'The source catalog changed. Read the current project.');
  });
  handle('project:snapshot', () => ({ ok: true, value: owner.snapshot() }));
  handle('project:edit', (input) => {
    const parsed = z
      .object({ request: z.unknown(), historyGroup: z.uuid().optional() })
      .safeParse(input);
    return parsed.success
      ? owner.edit(parsed.data.request, parsed.data.historyGroup)
      : failure('INVALID_INPUT', 'The editor edit request is invalid.');
  });
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
