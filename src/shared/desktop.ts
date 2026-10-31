import { z } from 'zod';
import { projectSchema } from './project';
import type { Result } from './result';
import type { ProjectSnapshot } from './project';

export const snapshotSchema = z.object({
  project: projectSchema,
  revision: z.number().int().nonnegative(),
  dirty: z.boolean(),
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
  snapshot: () => Promise<Result<ProjectSnapshot>>;
  subscribe: (listener: (snapshot: ProjectSnapshot) => void) => () => void;
}
