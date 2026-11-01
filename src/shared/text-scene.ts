import { z } from 'zod';

export const textLayers = {
  title: { id: 'heading', label: 'Heading', maxLength: 200 },
  body: { id: 'body', label: 'Body', maxLength: 10000 },
  code: { id: 'code', label: 'Code', maxLength: 16000 },
} as const;
export type TextField = keyof typeof textLayers;
export const textScenePropsSchema = z.object({
  title: z.string().max(textLayers.title.maxLength),
  body: z.string().max(textLayers.body.maxLength),
  layout: z.enum(['title', 'content', 'code', 'process']),
  code: z.string().max(textLayers.code.maxLength).optional(),
  reveals: z.array(z.string().max(2000)).max(30),
});
