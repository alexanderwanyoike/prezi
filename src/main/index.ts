import { app, BrowserWindow, protocol } from 'electron';
import { join } from 'node:path';
import { consumeResume } from './updates/resume-project';
import { createInstalledUpdates } from './updates/runtime';
import { registerUpdateIpc } from './updates/register-ipc';
import { WorkspaceOwner } from './mcp/workspace-owner';
import { registerWorkspaceIpc } from './mcp/register-workspace-ipc';
import { registerConnectionIpc } from './mcp/register-connection-ipc';
import { startMcp } from './mcp/server';
import type { McpConnection } from './mcp/server';
import { registerMedia } from './media/register-media';
import { registerDesktopIpc } from './register-desktop-ipc';
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
const workspace = new WorkspaceOwner(owner);
let mcp: McpConnection | undefined;
let installedUpdates: ReturnType<typeof createInstalledUpdates> | undefined;

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
  const connected = await startMcp(owner, app.getPath('userData'), workspace);
  if (connected.ok) mcp = connected.value;
  else process.stderr.write(`${connected.error.message}\n`);
  registerConnectionIpc(window, connected);
  registerWorkspaceIpc(window, workspace);
  registerProjectIpc(window, owner);
  registerDesktopIpc(window);
  registerMedia(window, owner);
  const files = registerFileIpc(window, owner);
  installedUpdates = createInstalledUpdates(() => owner.snapshot().filePath);
  registerUpdateIpc(window, installedUpdates.updates, files.prepareRestart);
  installedUpdates.start();
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
  .then(async () => {
    const resume = await consumeResume(app.getPath('userData'));
    if (!resume.ok) process.stderr.write(`${resume.error.message}\n`);
    else if (resume.value) {
      const restored = await owner.open(resume.value, owner.snapshot().revision);
      if (!restored.ok)
        process.stderr.write(`Could not reopen the saved project: ${restored.error.message}\n`);
    }
    await openWindow();
  })
  .catch(() => {
    app.quit();
  });
app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  installedUpdates?.stop();
  void mcp?.close();
  void owner.dispose();
});
