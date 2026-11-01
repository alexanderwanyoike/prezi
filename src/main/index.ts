import { app, BrowserWindow, protocol } from 'electron';
import { join } from 'node:path';
import { RenderWork } from './source/render-work';
import { PreviewJobs } from './previews/preview-jobs';
import { TransitionJobs } from './transitions/transition-jobs';
import { evaluateTransition } from './transitions/evaluate-transition';
import { captureSlide } from './previews/capture-slide';
import { registerPreviewIpc } from './previews/register-preview-ipc';
import { registerSceneIpc } from './source/register-scene-ipc';
import { SceneJobs } from './source/scene-jobs';
import { runCompiler } from './source/run-compiler';
import { validateScene } from './scenes/validate-scene';
import { registerSceneRuntime } from './scenes/register-runtime';
import { failure } from '../shared/result';
import { consumeResume } from './updates/resume-project';
import { createInstalledUpdates } from './updates/runtime';
import { registerUpdateIpc } from './updates/register-ipc';
import { WorkspaceOwner } from './mcp/workspace-owner';
import { registerWorkspaceIpc } from './mcp/register-workspace-ipc';
import { registerConnectionIpc } from './mcp/register-connection-ipc';
import { startMcp } from './mcp/server';
import type { McpConnection } from './mcp/server';
import { registerFontIpc } from './media/register-font-ipc';
import { registerMedia } from './media/register-media';
import { registerDesktopIpc } from './register-desktop-ipc';
import { registerPresentationIpc } from './register-presentation-ipc';
import { registerFileIpc } from './project/register-file-ipc';
import { ProjectOwner } from './project/project-owner';
import { registerProjectIpc } from './project/register-project-ipc';

app.commandLine.appendSwitch('site-per-process');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'prezi-scene',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
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

const owner = new ProjectOwner(join(import.meta.dirname, '../../resources/example.webm'));
const workspace = new WorkspaceOwner(owner);
let mcp: McpConnection | undefined;
let sceneJobs: SceneJobs | undefined;
let previewJobs: PreviewJobs | undefined;
let transitionJobs: TransitionJobs | undefined;
let installedUpdates: ReturnType<typeof createInstalledUpdates> | undefined;

async function openWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 680,
    icon: join(import.meta.dirname, '../../resources/icons/icon.png'),
    backgroundColor: '#1b1e24',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  registerSceneRuntime(window);
  const renderWork = new RenderWork();
  previewJobs = new PreviewJobs(owner, renderWork, (project, id, reveal, signal) =>
    captureSlide(project, id, reveal, signal, window.webContents.mainFrame.osProcessId),
  );
  registerPreviewIpc(window, previewJobs);
  transitionJobs = new TransitionJobs(
    owner,
    renderWork,
    (request, signal) =>
      runCompiler(
        request.candidate.source,
        signal,
        join(import.meta.dirname, '../compiler'),
        request.candidate.fields,
        'transition',
      ),
    (code, properties, signal) =>
      evaluateTransition(code, properties, signal, window.webContents.mainFrame.osProcessId),
  );
  registerSceneIpc(window, transitionJobs, 'transitions');
  sceneJobs = new SceneJobs(
    owner,
    (request, signal) =>
      runCompiler(
        request.candidate.source,
        signal,
        join(import.meta.dirname, '../compiler'),
        request.candidate.fields,
      ),
    (request, code, signal) => {
      const { project } = owner.snapshot();
      const slide = project.slides.find((item) => item.id === request.slideId);
      return slide
        ? validateScene(
            request,
            code,
            slide,
            signal,
            window.webContents.mainFrame.osProcessId,
            project.theme,
            project.fonts,
          )
        : Promise.resolve(failure('NOT_FOUND', 'The slide no longer exists.'));
    },
    renderWork,
  );
  registerSceneIpc(window, sceneJobs);
  window.on('closed', () => {
    sceneJobs?.dispose();
    previewJobs?.dispose();
    transitionJobs?.dispose();
    app.quit();
  });
  const connected = await startMcp(
    owner,
    app.getPath('userData'),
    workspace,
    sceneJobs,
    previewJobs,
    transitionJobs,
  );
  if (connected.ok) mcp = connected.value;
  else process.stderr.write(`${connected.error.message}\n`);
  registerConnectionIpc(window, connected);
  registerWorkspaceIpc(window, workspace);
  registerProjectIpc(window, owner);
  registerDesktopIpc(window);
  registerMedia(window, owner);
  registerFontIpc(window, owner);
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

let quitting = false;
app.on('will-quit', (event) => {
  event.preventDefault();
  if (quitting) return;
  quitting = true;
  installedUpdates?.stop();
  sceneJobs?.dispose();
  previewJobs?.dispose();
  transitionJobs?.dispose();
  void Promise.allSettled([mcp?.close(), owner.dispose()]).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected')
        process.stderr.write('Prezi could not finish all shutdown cleanup.\n');
      else if (result.value && !result.value.ok)
        process.stderr.write(`${result.value.error.message}\n`);
    });
    app.exit(0);
  });
});
