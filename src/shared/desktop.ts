import { z } from 'zod';
import { resultSchema } from './result';
import type { SceneJob, SceneJobRequest } from './scene-jobs';
import type { TransitionRequest } from './transition';
import type { PreviewJob, PreviewRequest } from './preview';
import { projectSchema } from './project';
import type { DesktopCommand, NativeEditCommand } from './desktop-commands';
import type { UpdateCommand, UpdateSnapshot } from './updates';
import type { Selection, WorkspacePatch } from './workspace';
import type { Result } from './result';
import type { EditRequest, ProjectSnapshot } from './project';

export const snapshotSchema = z.object({
  project: projectSchema,
  revision: z.number().int().nonnegative(),
  dirty: z.boolean(),
  undoLabel: z.string().nullable(),
  redoLabel: z.string().nullable(),
  canUndo: z.boolean(),
  canRedo: z.boolean(),
  filePath: z.string().nullable(),
});
export const snapshotResultSchema = resultSchema(snapshotSchema);
export interface DesktopBridge {
  platform: NodeJS.Platform;
  submitTransition: (request: TransitionRequest) => Promise<Result<SceneJob>>;
  transitionJob: (id: string) => Promise<Result<SceneJob>>;
  cancelTransitionJob: (id: string) => Promise<Result<SceneJob>>;
  capturePreview: (request: PreviewRequest) => Promise<Result<PreviewJob>>;
  cancelPreview: (id: string) => Promise<Result<PreviewJob>>;
  previews: () => Promise<Result<PreviewJob[]>>;
  subscribePreviews: (listener: (job: PreviewJob) => void) => () => void;
  submitScene: (request: SceneJobRequest) => Promise<Result<SceneJob>>;
  sceneJob: (id: string) => Promise<Result<SceneJob>>;
  cancelSceneJob: (id: string) => Promise<Result<SceneJob>>;
  stopScene: (instance: string) => Promise<Result<boolean>>;
  prepareScene: (instance: string) => Promise<Result<boolean>>;
  updateStatus: () => Promise<Result<UpdateSnapshot>>;
  updateAction: (command: UpdateCommand) => Promise<Result<UpdateSnapshot>>;
  subscribeUpdates: (listener: (snapshot: UpdateSnapshot) => void) => () => void;
  mcpStatus: () => Promise<Result<{ url: string }>>;
  copyMcpConfig: () => Promise<Result<boolean>>;
  publishView: (patch: WorkspacePatch) => Promise<Result<boolean>>;
  subscribeSelection: (listener: (selection: Selection) => void) => () => void;
  close: () => Promise<Result<boolean>>;
  nativeEdit: (command: NativeEditCommand) => Promise<Result<boolean>>;
  subscribeCommand: (listener: (command: DesktopCommand) => void) => () => void;
  replaceMedia: (slideId: string) => Promise<Result<ProjectSnapshot>>;
  replaceFont: (fontId: string) => Promise<Result<ProjectSnapshot>>;
  importFont: () => Promise<Result<ProjectSnapshot>>;
  importMedia: (slideId: string) => Promise<Result<ProjectSnapshot>>;
  fullscreen: (enabled: boolean) => Promise<Result<boolean>>;
  newProject: () => Promise<Result<ProjectSnapshot>>;
  open: () => Promise<Result<ProjectSnapshot>>;
  save: (saveAs?: boolean) => Promise<Result<ProjectSnapshot>>;
  edit: (request: EditRequest, historyGroup?: string) => Promise<Result<ProjectSnapshot>>;
  undo: (expectedRevision: number) => Promise<Result<ProjectSnapshot>>;
  redo: (expectedRevision: number) => Promise<Result<ProjectSnapshot>>;
  snapshot: () => Promise<Result<ProjectSnapshot>>;
  subscribe: (listener: (snapshot: ProjectSnapshot) => void) => () => void;
}

export const fullscreenResultSchema = resultSchema(z.boolean());

export const booleanResultSchema = fullscreenResultSchema;
