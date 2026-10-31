import { ipcMain, net, protocol } from 'electron';
import type { BrowserWindow, WebFrameMain } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import { bindRendererBudget } from './renderer-budget';
import type { RendererBoundary } from './renderer-budget';

const boundaries = new WeakMap<WebFrameMain, Promise<Result<RendererBoundary>>>();
export async function prepareSceneFrame(
  frame: WebFrameMain,
  editorPid: number,
): Promise<Result<boolean>> {
  if (frame.detached || frame.osProcessId === editorPid || !frame.url.startsWith('prezi-scene://'))
    return failure('INVALID_INPUT', 'The scene must run in its own renderer.');
  const pid = frame.osProcessId;
  let boundary = boundaries.get(frame);
  if (!boundary) {
    boundary = bindRendererBudget(pid);
    boundaries.set(frame, boundary);
  }
  const result = await boundary;
  if (!result.ok) return result;
  const changed = (): boolean => frame.detached || frame.osProcessId !== pid;
  if (changed()) return failure('CANCELLED', 'The scene renderer changed before it was ready.');
  return { ok: true, value: true };
}
export function registerSceneRuntime(window: BrowserWindow): void {
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  window.webContents.session.setPermissionCheckHandler(() => false);
  protocol.handle('prezi-scene', async (request) => {
    const url = new URL(request.url);
    if (
      !z.uuid().safeParse(url.hostname).success ||
      request.method !== 'GET' ||
      !/^\/(?:index\.html|[a-z-]+\.js|assets\/[a-zA-Z0-9_.-]+\.(?:js|css|woff2?|png))$/.test(
        url.pathname,
      )
    )
      return new Response('Scene resource not found', { status: 404 });
    return net.fetch(
      pathToFileURL(join(import.meta.dirname, '../scenes', url.pathname.slice(1))).toString(),
    );
  });
  ipcMain.handle('scenes:prepare', async (event, input: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted scene request.');
    const instance = z.uuid().safeParse(input);
    if (!instance.success) return failure('INVALID_INPUT', 'A scene instance ID is required.');
    const frame = window.webContents.mainFrame.framesInSubtree.find(
      (item) => item.url === `prezi-scene://${instance.data}/index.html`,
    );
    return frame
      ? prepareSceneFrame(frame, window.webContents.mainFrame.osProcessId)
      : failure('NOT_FOUND', 'The scene renderer is not ready.');
  });
  window.webContents.on('will-frame-navigate', (event) => {
    if (!/^prezi-scene:\/\/[a-f0-9-]+\/index\.html$/.test(event.url)) event.preventDefault();
  });
}
