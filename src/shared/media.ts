import { z } from 'zod';

export const mediaSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  kind: z.enum(['image', 'video']),
  extension: z.enum(['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm']),
});
export type MediaAsset = z.infer<typeof mediaSchema>;
export function mediaUrl(id: string): string {
  return `prezi-media://asset/${id}`;
}
