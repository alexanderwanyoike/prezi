import { z } from 'zod';
import { sceneCandidateSchema, sceneValuesSchema } from './scene-definition';
import { compilationSchema } from './custom-scene';

export const sceneJobRequestSchema = z.object({
  requestId: z.string().min(1).max(100),
  expectedRevision: z.number().int().nonnegative(),
  label: z.string().min(1).max(100),
  slideId: z.uuid(),
  candidate: sceneCandidateSchema,
  properties: sceneValuesSchema,
});
const resourceSchema = compilationSchema.options[0].shape.value.shape.resources;
export const sceneJobSchema = z.object({
  id: z.string(),
  label: z.string(),
  state: z.enum(['queued', 'compiling', 'validating', 'complete', 'failed', 'cancelled']),
  revision: z.number().optional(),
  resources: resourceSchema,
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      diagnostics: z
        .array(
          z.object({ file: z.string(), line: z.number(), column: z.number(), message: z.string() }),
        )
        .optional(),
    })
    .optional(),
});
export const sceneJobResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: sceneJobSchema }),
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
export type SceneJobRequest = z.infer<typeof sceneJobRequestSchema>;
export type SceneJob = z.infer<typeof sceneJobSchema>;
