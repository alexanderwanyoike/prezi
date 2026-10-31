import { z } from 'zod';

export const updateStateSchema = z.discriminatedUnion('stage', [
  z.object({ stage: z.literal('disabled'), reason: z.string() }),
  z.object({ stage: z.literal('idle') }),
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
