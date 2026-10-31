import { contextBridge, ipcRenderer } from 'electron';
import { snapshotResultSchema, snapshotSchema } from '../shared/desktop';
import type { DesktopBridge } from '../shared/desktop';
import { failure } from '../shared/result';

const bridge: DesktopBridge = {
  async snapshot() {
    try {
      const response: unknown = await ipcRenderer.invoke('project:snapshot');
      const parsed = snapshotResultSchema.safeParse(response);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The project response was invalid.');
    } catch {
      return failure('IO_ERROR', 'The project service could not be reached.');
    }
  },
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
