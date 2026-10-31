import { z } from 'zod';
import { sceneCandidateSchema, sceneValuesSchema } from './scene-definition';
import { mediaSchema } from './media';

export const runtimeDefinitionSchema = sceneCandidateSchema.pick({
  id: true,
  name: true,
  fields: true,
  layers: true,
});
export const runtimeStateSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(10000),
  reveal: z.number().int().min(0).max(30),
  probeFrame: z.number().int().min(0).max(11).optional(),
  properties: sceneValuesSchema,
  media: mediaSchema.nullable(),
  editing: z.boolean(),
  pending: z.boolean(),
  active: z.boolean(),
  autoplay: z.boolean(),
  selectedLayer: z.string().nullable(),
});
export const runtimeMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prezi:load'),
    code: z.string().max(2 * 1024 * 1024),
    definition: runtimeDefinitionSchema,
    state: runtimeStateSchema,
  }),
  z.object({ type: z.literal('prezi:update'), state: runtimeStateSchema }),
]);
export const runtimeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prezi:status'),
    state: z.enum(['ready', 'error']),
    message: z.string().max(2000).optional(),
  }),
  z.object({ type: z.literal('prezi:select'), layer: z.string().max(32) }),
  z.object({
    type: z.literal('prezi:edit'),
    property: z.string().max(32),
    value: z.union([z.string().max(10000), z.number(), z.boolean()]),
  }),
  z.object({
    type: z.literal('prezi:key'),
    key: z.enum([' ', 'ArrowLeft', 'ArrowRight', 'Escape']),
    repeat: z.boolean(),
  }),
]);
export type RuntimeState = z.infer<typeof runtimeStateSchema>;
export type RuntimeDefinition = z.infer<typeof runtimeDefinitionSchema>;
export type RuntimeEvent = z.infer<typeof runtimeEventSchema>;
