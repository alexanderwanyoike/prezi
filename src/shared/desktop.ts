import { z } from 'zod';
import { projectSchema } from './project';
import type { DesktopCommand, NativeEditCommand } from './desktop-commands';
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
export const snapshotResultSchema = z.union([
  z.object({ ok: z.literal(true), value: snapshotSchema }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.enum([
        'INVALID_INPUT',
        'CONFLICT',
        'REQUEST_REUSED',
        'NOT_FOUND',
        'IO_ERROR',
        'CANCELLED',
      ]),
      message: z.string(),
    }),
  }),
]);
export interface DesktopBridge {
  platform: NodeJS.Platform;
  close: () => Promise<Result<boolean>>;
  nativeEdit: (command: NativeEditCommand) => Promise<Result<boolean>>;
  subscribeCommand: (listener: (command: DesktopCommand) => void) => () => void;
  importMedia: (slideId: string) => Promise<Result<ProjectSnapshot>>;
  fullscreen: (enabled: boolean) => Promise<Result<boolean>>;
  newProject: () => Promise<Result<ProjectSnapshot>>;
  open: () => Promise<Result<ProjectSnapshot>>;
  save: (saveAs?: boolean) => Promise<Result<ProjectSnapshot>>;
  edit: (request: EditRequest) => Promise<Result<ProjectSnapshot>>;
  undo: (expectedRevision: number) => Promise<Result<ProjectSnapshot>>;
  redo: (expectedRevision: number) => Promise<Result<ProjectSnapshot>>;
  snapshot: () => Promise<Result<ProjectSnapshot>>;
  subscribe: (listener: (snapshot: ProjectSnapshot) => void) => () => void;
}

export const fullscreenResultSchema = z.union([
  z.object({ ok: z.literal(true), value: z.boolean() }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.enum([
        'INVALID_INPUT',
        'CONFLICT',
        'REQUEST_REUSED',
        'NOT_FOUND',
        'IO_ERROR',
        'CANCELLED',
      ]),
      message: z.string(),
    }),
  }),
]);

export const booleanResultSchema = fullscreenResultSchema;
