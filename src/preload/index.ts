import { contextBridge, ipcRenderer } from 'electron';
import { fullscreenResultSchema, snapshotResultSchema, snapshotSchema } from '../shared/desktop';
import type { DesktopBridge } from '../shared/desktop';
import { failure } from '../shared/result';

async function request(channel: string, input?: unknown) {
  try {
    const response: unknown = await ipcRenderer.invoke(channel, input);
    const parsed = snapshotResultSchema.safeParse(response);
    return parsed.success ? parsed.data : failure('IO_ERROR', 'The project response was invalid.');
  } catch {
    return failure('IO_ERROR', 'The project service could not be reached.');
  }
}

const bridge: DesktopBridge = {
  importMedia: (slideId) => request('project:importMedia', slideId),
  async fullscreen(enabled) {
    try {
      const response: unknown = await ipcRenderer.invoke('presentation:fullscreen', enabled);
      const parsed = fullscreenResultSchema.safeParse(response);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The fullscreen response was invalid.');
    } catch {
      return failure('IO_ERROR', 'Fullscreen could not be changed.');
    }
  },
  newProject: () => request('project:new'),
  open: () => request('project:open'),
  save: (saveAs = false) => request(saveAs ? 'project:saveAs' : 'project:save'),
  snapshot: () => request('project:snapshot'),
  edit: (input) => request('project:edit', input),
  undo: (revision) => request('project:undo', revision),
  redo: (revision) => request('project:redo', revision),
  subscribe(listener) {
    const receive = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      const parsed = snapshotSchema.safeParse(value);
      if (parsed.success) listener(parsed.data);
    };
    ipcRenderer.on('project:changed', receive);
    return () => {
      ipcRenderer.removeListener('project:changed', receive);
    };
  },
};
contextBridge.exposeInMainWorld('prezi', bridge);
