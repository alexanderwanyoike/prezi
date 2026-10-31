import { contextBridge, ipcRenderer } from 'electron';
import { sceneJobResultSchema } from '../shared/scene-jobs';
import { fullscreenResultSchema, snapshotResultSchema, snapshotSchema } from '../shared/desktop';
import type { DesktopBridge } from '../shared/desktop';
import { updateResultSchema, updateSnapshotSchema } from '../shared/updates';
import type { UpdateCommand } from '../shared/updates';
import { mcpStatusSchema } from '../shared/mcp';
import { selectionSchema } from '../shared/workspace';
import { desktopCommandSchema } from '../shared/desktop-commands';
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

async function updateRequest(command: 'status' | UpdateCommand) {
  try {
    const response: unknown = await ipcRenderer.invoke(`updates:${command}`);
    const parsed = updateResultSchema.safeParse(response);
    return parsed.success ? parsed.data : failure('IO_ERROR', 'The update response was invalid.');
  } catch {
    return failure('IO_ERROR', 'The update service could not be reached.');
  }
}
async function sceneRequest(command: 'submit' | 'read' | 'cancel', input: unknown) {
  try {
    const result: unknown = await ipcRenderer.invoke(`scenes:${command}`, input);
    const parsed = sceneJobResultSchema.safeParse(result);
    return parsed.success
      ? parsed.data
      : failure('IO_ERROR', 'The scene job response was invalid.');
  } catch {
    return failure('IO_ERROR', 'The scene job service could not be reached.');
  }
}
const bridge: DesktopBridge = {
  platform: process.platform,
  submitScene: (input) => sceneRequest('submit', input),
  sceneJob: (id) => sceneRequest('read', id),
  cancelSceneJob: (id) => sceneRequest('cancel', id),
  async prepareScene(instance) {
    try {
      const input: unknown = await ipcRenderer.invoke('scenes:prepare', instance);
      const parsed = fullscreenResultSchema.safeParse(input);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The scene resource response was invalid.');
    } catch {
      return failure('IO_ERROR', 'The scene renderer could not be prepared.');
    }
  },
  updateStatus: () => updateRequest('status'),
  updateAction: (command) => updateRequest(command),
  subscribeUpdates(listener) {
    const receive = (_event: Electron.IpcRendererEvent, input: unknown): void => {
      const parsed = updateSnapshotSchema.safeParse(input);
      if (parsed.success) listener(parsed.data);
    };
    ipcRenderer.on('updates:changed', receive);
    return () => {
      ipcRenderer.removeListener('updates:changed', receive);
    };
  },
  async mcpStatus() {
    try {
      const response: unknown = await ipcRenderer.invoke('mcp:status');
      const parsed = mcpStatusSchema.safeParse(response);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The MCP status response was invalid.');
    } catch {
      return failure('IO_ERROR', 'MCP status could not be read.');
    }
  },
  async copyMcpConfig() {
    try {
      const response: unknown = await ipcRenderer.invoke('mcp:copy');
      const parsed = fullscreenResultSchema.safeParse(response);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The MCP copy response was invalid.');
    } catch {
      return failure('IO_ERROR', 'MCP configuration could not be copied.');
    }
  },
  async publishView(patch) {
    try {
      const response: unknown = await ipcRenderer.invoke('workspace:publish', patch);
      const parsed = fullscreenResultSchema.safeParse(response);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The workspace response was invalid.');
    } catch {
      return failure('IO_ERROR', 'Workspace state could not be shared.');
    }
  },
  subscribeSelection(listener) {
    const receive = (_event: Electron.IpcRendererEvent, input: unknown): void => {
      const parsed = selectionSchema.safeParse(input);
      if (parsed.success) listener(parsed.data);
    };
    ipcRenderer.on('workspace:selection', receive);
    return () => {
      ipcRenderer.removeListener('workspace:selection', receive);
    };
  },
  async close() {
    try {
      const response: unknown = await ipcRenderer.invoke('desktop:close');
      const parsed = fullscreenResultSchema.safeParse(response);
      return parsed.success ? parsed.data : failure('IO_ERROR', 'The close response was invalid.');
    } catch {
      return failure('IO_ERROR', 'The window could not be closed.');
    }
  },
  async nativeEdit(command) {
    try {
      const response: unknown = await ipcRenderer.invoke('desktop:edit', command);
      const parsed = fullscreenResultSchema.safeParse(response);
      return parsed.success
        ? parsed.data
        : failure('IO_ERROR', 'The editing response was invalid.');
    } catch {
      return failure('IO_ERROR', 'The editing command could not be completed.');
    }
  },
  subscribeCommand(listener) {
    const receive = (_event: Electron.IpcRendererEvent, command: unknown): void => {
      const parsed = desktopCommandSchema.safeParse(command);
      if (parsed.success) listener(parsed.data);
    };
    ipcRenderer.on('desktop:command', receive);
    return () => {
      ipcRenderer.removeListener('desktop:command', receive);
    };
  },
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
