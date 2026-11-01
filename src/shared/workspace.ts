import { z } from 'zod';

export const selectionSchema = z.object({
  slideId: z.uuid(),
  elementId: z.string().max(100).nullable(),
});
export const positionSchema = z.object({
  slideId: z.uuid(),
  reveal: z.number().int().min(0).max(30),
});
export const workspaceSchema = z.object({
  selection: selectionSchema,
  presentation: positionSchema.nullable(),
});
export const workspacePatchSchema = workspaceSchema.partial();
export type Selection = z.infer<typeof selectionSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspacePatch = z.infer<typeof workspacePatchSchema>;
