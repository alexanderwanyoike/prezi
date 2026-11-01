import { z } from 'zod';
import { resultSchema } from './result';
import { sceneCandidateSchema, sceneValuesSchema } from './scene-definition';
import { compilationSchema } from './custom-scene';

export const sceneJobRequestSchema = z.object({
  consumeDraft: z.boolean().optional(),
  expectedDefinitionVersion: z.uuid().nullable().optional(),
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
export const sceneJobResultSchema = resultSchema(sceneJobSchema);
export type SceneJobRequest = z.infer<typeof sceneJobRequestSchema>;
export type SceneJob = z.infer<typeof sceneJobSchema>;
