import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { z } from 'zod';
import { failure } from '../../shared/result';
import type { SceneJobs } from './scene-jobs';

export function registerSceneIpc(
  window: BrowserWindow,
  jobs: Pick<SceneJobs, 'submit' | 'read' | 'cancel'>,
  namespace: 'scenes' | 'transitions' = 'scenes',
): void {
  ipcMain.handle(`${namespace}:submit`, (event, input: unknown) =>
    event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame
      ? jobs.submit(input)
      : failure('INVALID_INPUT', 'Untrusted scene request.'),
  );
  (['read', 'cancel'] as const).forEach((command) => {
    ipcMain.handle(`${namespace}:${command}`, (event, input: unknown) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
        return failure('INVALID_INPUT', 'Untrusted scene request.');
      const id = z.string().min(1).max(100).safeParse(input);
      return id.success
        ? jobs[command](id.data)
        : failure('INVALID_INPUT', 'A valid job ID is required.');
    });
  });
}
