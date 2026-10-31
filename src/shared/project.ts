import { z } from 'zod';
import { textScenePropsSchema } from './text-scene';

export const slideSchema = textScenePropsSchema.extend({ id: z.uuid() });
export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.uuid(),
  name: z.string().min(1).max(200),
  slides: z.array(slideSchema).min(1).max(200),
});
export type Slide = z.infer<typeof slideSchema>;
export type Project = z.infer<typeof projectSchema>;
export interface ProjectSnapshot {
  project: Project;
  revision: number;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  filePath: string | null;
}
export const editRequestSchema = z.object({
  requestId: z.string().min(1).max(100),
  expectedRevision: z.number().int().nonnegative(),
  label: z.string().min(1).max(100),
  operations: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('updateSlide'),
          slideId: z.uuid(),
          patch: slideSchema.omit({ id: true }).partial(),
        }),
        z.object({
          type: z.literal('addSlide'),
          slide: slideSchema,
          index: z.number().int().nonnegative(),
        }),
        z.object({ type: z.literal('duplicateSlide'), slideId: z.uuid(), newId: z.uuid() }),
        z.object({ type: z.literal('deleteSlide'), slideId: z.uuid() }),
        z.object({
          type: z.literal('moveSlide'),
          slideId: z.uuid(),
          index: z.number().int().nonnegative(),
        }),
        z.object({ type: z.literal('renameProject'), name: z.string().min(1).max(200) }),
      ]),
    )
    .min(1)
    .max(100),
});
export type EditOperation = z.infer<typeof editRequestSchema>['operations'][number];
export type EditRequest = z.infer<typeof editRequestSchema>;

export function createProject(): Project {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Vibez / how I built it',
    slides: [
      {
        id: crypto.randomUUID(),
        title: 'Vibez / how I built it',
        body: 'A small idea. A working application.\nThe steps in between.',
        layout: 'title',
        reveals: [],
      },
      {
        id: crypto.randomUUID(),
        title: 'From idea to something useful',
        body: 'One deliberate step at a time.',
        layout: 'content',
        reveals: [
          'Planning / find the smallest useful idea',
          'Implementation / make it work',
          'Review / look at it with fresh eyes',
          'Human testing / try it for real',
        ],
      },
      {
        id: crypto.randomUUID(),
        title: 'Make room for the next idea.',
        body: 'Build a little. Try it. Keep what works.',
        layout: 'title',
        reveals: [],
      },
    ],
  };
}
