import { z } from 'zod';
import { resultSchema } from './result';

export const updateStateSchema = z.discriminatedUnion('stage', [
  z.object({ stage: z.literal('disabled'), reason: z.string() }),
  z.object({ stage: z.literal('idle') }),
  z.object({ stage: z.literal('current') }),
  z.object({ stage: z.literal('checking') }),
  z.object({ stage: z.literal('available'), version: z.string(), automatic: z.boolean() }),
  z.object({
    stage: z.literal('downloading'),
    version: z.string(),
    percent: z.number().min(0).max(100),
  }),
  z.object({ stage: z.literal('ready'), version: z.string() }),
  z.object({ stage: z.literal('installing'), version: z.string() }),
]);
export type UpdateState = z.infer<typeof updateStateSchema>;

export const updateSnapshotSchema = z.object({
  installedVersion: z.string(),
  state: updateStateSchema,
});
export const updateResultSchema = resultSchema(updateSnapshotSchema);
export type UpdateSnapshot = z.infer<typeof updateSnapshotSchema>;
export type UpdateCommand = 'check' | 'download' | 'install';
