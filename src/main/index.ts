import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { ProjectOwner } from './project/project-owner';
import { failure } from '../shared/result';

const owner = new ProjectOwner();

async function openWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#1b1e24',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  ipcMain.handle('project:snapshot', (event) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted project request.');
    return { ok: true, value: owner.snapshot() };
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  window.removeMenu();
  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  }
}

app
  .whenReady()
  .then(openWindow)
  .catch(() => {
    app.quit();
  });
app.on('window-all-closed', () => {
  app.quit();
});
