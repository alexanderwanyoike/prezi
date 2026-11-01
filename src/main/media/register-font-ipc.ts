import { dialog, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { z } from 'zod';
import type { ProjectOwner } from '../project/project-owner';
import { failure } from '../../shared/result';

export function registerFontIpc(window: BrowserWindow, owner: ProjectOwner): void {
  (['importFont', 'replaceFont'] as const).forEach((command) => {
    ipcMain.handle(`project:${command}`, async (event, input: unknown) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
        return failure('INVALID_INPUT', 'Untrusted font request.');
      const replace = command === 'replaceFont';
      const fontId = z.uuid().safeParse(input);
      if (replace && !fontId.success)
        return failure('INVALID_INPUT', 'Choose a registered font to locate.');
      const snapshot = owner.snapshot();
      if (
        replace &&
        !snapshot.project.fonts?.some((font) => font.id === (fontId.success ? fontId.data : null))
      )
        return failure('NOT_FOUND', 'The font no longer exists.');
      try {
        const chosen = await dialog.showOpenDialog(window, {
          title: replace ? 'Locate font' : 'Import font',
          properties: ['openFile'],
          filters: [{ name: 'Local fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
        });
        const path = chosen.filePaths[0];
        if (chosen.canceled || !path) return failure('CANCELLED', 'Font selection was cancelled.');
        return await owner.importFont(
          path,
          snapshot.revision,
          undefined,
          {},
          replace && fontId.success ? fontId.data : null,
        );
      } catch {
        return failure('IO_ERROR', 'The font file dialog could not be opened.');
      }
    });
  });
}
