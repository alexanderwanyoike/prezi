import { dialog, ipcMain, net, protocol } from 'electron';
import type { BrowserWindow } from 'electron';
import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { byteRange } from './byte-range';
import type { ProjectOwner } from '../project/project-owner';
import { failure } from '../../shared/result';

export function registerMedia(window: BrowserWindow, owner: ProjectOwner): void {
  protocol.handle('prezi-media', async (request) => {
    const url = new URL(request.url);
    const id = z.uuid().safeParse(url.pathname.slice(1));
    if (url.hostname !== 'asset' || !id.success || !['GET', 'HEAD'].includes(request.method))
      return new Response('Invalid media request', { status: 400 });
    const path = owner.mediaPath(id.data);
    if (!path) return new Response('Media not found', { status: 404 });
    try {
      const { size } = await stat(path);
      const range = byteRange(request.headers.get('Range'), size);
      if (!range.ok)
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${size.toString()}` },
        });
      const headers = new Headers(request.headers);
      headers.delete('Range');
      if (range.value)
        headers.set('Range', `bytes=${range.value.start.toString()}-${range.value.end.toString()}`);
      const response = await net.fetch(pathToFileURL(path).toString(), {
        method: request.method,
        headers,
      });
      const outputHeaders = new Headers(response.headers);
      outputHeaders.set('Accept-Ranges', 'bytes');
      outputHeaders.set('Access-Control-Allow-Origin', '*');
      outputHeaders.set('Content-Length', size.toString());
      if (range.value) {
        outputHeaders.set(
          'Content-Range',
          `bytes ${range.value.start.toString()}-${range.value.end.toString()}/${size.toString()}`,
        );
        outputHeaders.set('Content-Length', (range.value.end - range.value.start + 1).toString());
      }
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: range.value ? 206 : 200,
        headers: outputHeaders,
      });
    } catch {
      return new Response('Media is missing or unreadable', { status: 404 });
    }
  });
  ipcMain.handle('project:importMedia', async (event, input: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
      return failure('INVALID_INPUT', 'Untrusted media request.');
    const slideId = z.uuid().safeParse(input);
    if (!slideId.success) return failure('INVALID_INPUT', 'Choose a slide before importing media.');
    const { revision } = owner.snapshot();
    try {
      const chosen = await dialog.showOpenDialog(window, {
        title: 'Import media',
        properties: ['openFile'],
        filters: [
          {
            name: 'Images and video',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm'],
          },
        ],
      });
      const path = chosen.filePaths[0];
      if (chosen.canceled || !path) return failure('CANCELLED', 'Media import was cancelled.');
      return await owner.importMedia(path, slideId.data, revision);
    } catch {
      return failure('IO_ERROR', 'The media file dialog could not be opened.');
    }
  });
}
