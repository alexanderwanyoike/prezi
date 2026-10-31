import { z } from 'zod';
import { assetCreditSchema } from './asset-credit';

const mediaFrameFields = z.object({
  x: z.number().min(0).max(1856),
  y: z.number().min(0).max(1016),
  width: z.number().min(64).max(1920),
  height: z.number().min(64).max(1080),
});
export const mediaFrameSchema = mediaFrameFields.refine(
  (frame) => frame.x + frame.width <= 1920 && frame.y + frame.height <= 1080,
);
export const mediaPropertiesSchema = assetCreditSchema.extend({
  frame: mediaFrameSchema.optional(),
  fit: z.enum(['contain', 'cover']).optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  volume: z.number().min(0).max(1).optional(),
});
export const mediaSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  kind: z.enum(['image', 'video']),
  extension: z.enum(['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm']),
  ...mediaPropertiesSchema.shape,
});
export const mediaPatchSchema = mediaPropertiesSchema
  .partial()
  .extend({ frame: mediaFrameFields.partial().optional() });
export type MediaPatch = z.infer<typeof mediaPatchSchema>;
export type MediaAsset = z.infer<typeof mediaSchema>;
export function mediaUrl(id: string): string {
  return `prezi-media://asset/${id}`;
}

export function mediaFrame(media: MediaAsset): z.infer<typeof mediaFrameSchema> {
  return media.frame ?? { x: 1000, y: 220, width: 792, height: 640 };
}
