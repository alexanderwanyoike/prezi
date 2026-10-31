import { app, dialog, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { confirmReplacement as confirmContentReplacement } from './confirm-replacement';
import type { ProjectOwner } from './project-owner';
import type { ProjectSnapshot } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

async function save(
  window: BrowserWindow,
  owner: ProjectOwner,
  saveAs = false,
): Promise<Result<ProjectSnapshot>> {
  const snapshot = owner.snapshot();
  let path = snapshot.filePath;
  if (!path || saveAs) {
    const chosen = await dialog.showSaveDialog(window, {
      title: 'Save presentation',
      defaultPath:
        (path ? path.replace(/\.prezi(?:\.json)?$/i, '.prezi') : null) ??
        join(
          app.getPath('documents'),
          `${snapshot.project.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'presentation'}.prezi`,
        ),
      filters: [{ name: 'Prezi project', extensions: ['prezi'] }],
    });
    if (chosen.canceled || !chosen.filePath) return failure('CANCELLED', 'Saving was cancelled.');
    path = chosen.filePath;
  }
  return owner.save(path);
}

async function confirmReplacement(
  window: BrowserWindow,
  owner: ProjectOwner,
): Promise<Result<void>> {
  return confirmContentReplacement(
    owner,
    async () => {
      const choice = await dialog.showMessageBox(window, {
        type: 'question',
        title: 'Save your changes?',
        message: 'Your presentation has unsaved changes.',
        detail: 'Save the current deck before leaving it.',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
      });
      return choice.response;
    },
    () => save(window, owner),
  );
}

export function registerFileIpc(
  window: BrowserWindow,
  owner: ProjectOwner,
): { prepareRestart: () => Promise<Result<() => void>> } {
  function handle(channel: string, run: () => Promise<Result<ProjectSnapshot>>): void {
    ipcMain.handle(channel, async (event) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
        return failure('INVALID_INPUT', 'Untrusted file request.');
      try {
        return await run();
      } catch {
        return failure('IO_ERROR', 'The file dialog could not be opened. Your deck is still open.');
      }
    });
  }
  handle('project:save', () => save(window, owner));
  handle('project:saveAs', () => save(window, owner, true));
  handle('project:open', async () => {
    const { revision } = owner.snapshot();
    const confirmed = await confirmReplacement(window, owner);
    if (!confirmed.ok) return confirmed;
    const chosen = await dialog.showOpenDialog(window, {
      title: 'Open presentation',
      properties: ['openFile'],
      filters: [
        { name: 'Prezi project', extensions: ['prezi'] },
        { name: 'Legacy JSON project', extensions: ['json'] },
      ],
    });
    const path = chosen.filePaths[0];
    if (chosen.canceled || !path) return failure('CANCELLED', 'Opening was cancelled.');
    return owner.open(path, revision);
  });
  handle('project:new', async () => {
    const { revision } = owner.snapshot();
    const confirmed = await confirmReplacement(window, owner);
    return confirmed.ok ? owner.reset(revision) : confirmed;
  });
  let allowClose = false;
  let confirming = false;
  window.on('close', (event) => {
    if (allowClose || !owner.snapshot().dirty) return;
    event.preventDefault();
    if (confirming) return;
    confirming = true;
    void confirmReplacement(window, owner)
      .then((result) => {
        if (result.ok) {
          allowClose = true;
          window.close();
        } else if (result.error.code !== 'CANCELLED') {
          dialog.showErrorBox('Could not save presentation', result.error.message);
        }
      })
      .catch(() => {
        dialog.showErrorBox(
          'Could not close presentation',
          'Your current deck remains open. Try saving it first.',
        );
      })
      .finally(() => {
        confirming = false;
      });
  });
  return {
    async prepareRestart() {
      if (confirming) return failure('CONFLICT', 'A save prompt is already open.');
      confirming = true;
      try {
        const confirmed = await confirmReplacement(window, owner);
        if (!confirmed.ok) return confirmed;
        const locked = owner.beginRestart();
        if (!locked.ok) return locked;
        allowClose = true;
        return {
          ok: true,
          value: () => {
            allowClose = false;
            locked.value();
          },
        };
      } finally {
        confirming = false;
      }
    },
  };
}
