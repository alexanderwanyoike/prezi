import { app, BrowserWindow, protocol } from 'electron';
import { join } from 'node:path';
import { registerMedia } from './media/register-media';
import { registerPresentationIpc } from './register-presentation-ipc';
import { registerFileIpc } from './project/register-file-ipc';
import { ProjectOwner } from './project/project-owner';
import { registerProjectIpc } from './project/register-project-ipc';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'prezi-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

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
  registerProjectIpc(window, owner);
  registerMedia(window, owner);
  registerFileIpc(window, owner);
  registerPresentationIpc(window);
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

app.on('will-quit', () => {
  void owner.dispose();
});
