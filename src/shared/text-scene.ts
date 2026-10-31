import { z } from 'zod';

export const textLayers = {
  title: { id: 'heading', label: 'Heading', maxLength: 200 },
  body: { id: 'body', label: 'Body', maxLength: 10000 },
} as const;
export type TextField = keyof typeof textLayers;
export const textScenePropsSchema = z.object({
  title: z.string().max(textLayers.title.maxLength),
  body: z.string().max(textLayers.body.maxLength),
  layout: z.enum(['title', 'content']),
  reveals: z.array(z.string().max(2000)).max(30),
});
