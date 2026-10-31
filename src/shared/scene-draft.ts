import { z } from 'zod';
import { sceneSourceSchema } from './custom-scene';

export const sceneDraftSchema = z.object({
  definitionId: z.uuid(),
  baseVersion: z.uuid().nullable(),
  entry: sceneSourceSchema.shape.entry,
  files: sceneSourceSchema.shape.files,
  metadata: z.string().max(1000000),
});
export type SceneDraft = z.infer<typeof sceneDraftSchema>;
