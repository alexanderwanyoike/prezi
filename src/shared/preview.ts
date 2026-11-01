import { z } from 'zod';
import { resultSchema } from './result';
import type { Project, Slide } from './project';
import { slideSchema } from './project';
import { presentationThemeSchema } from './presentation-theme';

export const previewRequestSchema = z.object({
  requestId: z.string().min(9).max(100).startsWith('preview:'),
  expectedRevision: z.number().int().nonnegative(),
  slideId: z.uuid(),
  reveal: z.number().int().min(0).max(30).default(0),
});
export const previewImageSchema = z.object({
  dataUrl: z.string().startsWith('data:image/jpeg;base64,').max(1400000),
  width: z.literal(960),
  height: z.literal(540),
});
export const previewJobSchema = z.object({
  id: z.string(),
  slideId: z.uuid(),
  key: z.string(),
  revision: z.number().int().nonnegative(),
  state: z.enum(['queued', 'rendering', 'complete', 'failed', 'cancelled']),
  image: previewImageSchema.optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});
export const previewResultSchema = resultSchema(previewJobSchema);
export const previewListResultSchema = resultSchema(z.array(previewJobSchema).max(16));
export type PreviewRequest = z.infer<typeof previewRequestSchema>;
export type PreviewJob = z.infer<typeof previewJobSchema>;
export type PreviewImage = z.infer<typeof previewImageSchema>;

export function previewKey(project: Project, slide: Slide): string {
  return JSON.stringify({
    slide: slideSchema.parse(slide),
    theme: project.theme ? presentationThemeSchema.parse(project.theme) : undefined,
    fonts: project.fonts?.map(({ id, extension }) => ({ id, extension })),
    version: project.scenes?.[slide.scene?.definitionId ?? '']?.version,
    number: project.slides.findIndex((item) => item.id === slide.id) + 1,
    count: project.slides.length,
  });
}
