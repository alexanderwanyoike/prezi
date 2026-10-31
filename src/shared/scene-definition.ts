import { z } from 'zod';
import { sceneSourceSchema } from './custom-scene';

export const propertyNameSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/);
const label = { label: z.string().min(1).max(80) };
export const sceneFieldSchema = z.discriminatedUnion('type', [
  z.object({
    ...label,
    type: z.literal('text'),
    default: z.string().max(10000),
    multiline: z.boolean().optional(),
  }),
  z.object({ ...label, type: z.literal('color'), default: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  z.object({
    ...label,
    type: z.literal('number'),
    default: z.number(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({ ...label, type: z.literal('boolean'), default: z.boolean() }),
]);
export const sceneValuesSchema = z
  .record(propertyNameSchema, z.union([z.string().max(10000), z.number(), z.boolean()]))
  .refine((values) => Object.keys(values).length <= 32);
export const sceneCandidateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  source: sceneSourceSchema,
  fields: z
    .record(propertyNameSchema, sceneFieldSchema)
    .refine((fields) => Object.keys(fields).length <= 32),
  layers: z
    .array(
      z.object({
        id: propertyNameSchema,
        label: z.string().min(1).max(80),
        property: propertyNameSchema.optional(),
        frame: z
          .object({
            x: propertyNameSchema,
            y: propertyNameSchema,
            width: propertyNameSchema,
            height: propertyNameSchema,
          })
          .optional(),
      }),
    )
    .max(32),
});
export const sceneDefinitionSchema = sceneCandidateSchema.extend({
  code: z
    .string()
    .min(1)
    .max(2 * 1024 * 1024),
});
export const sceneInstanceSchema = z.object({
  definitionId: z.uuid(),
  properties: sceneValuesSchema,
});
export const sceneInstallationSchema = z.object({
  requestId: z.string().min(1).max(100),
  expectedRevision: z.number().int().nonnegative(),
  label: z.string().min(1).max(100),
  slideId: z.uuid(),
  definition: sceneDefinitionSchema,
  properties: sceneValuesSchema,
});
export type SceneCandidate = z.infer<typeof sceneCandidateSchema>;
export type CustomSceneDefinition = z.infer<typeof sceneDefinitionSchema>;
export type SceneValues = z.infer<typeof sceneValuesSchema>;
export type SceneInstallation = z.infer<typeof sceneInstallationSchema>;

export function validSceneValues(definition: CustomSceneDefinition, values: SceneValues): boolean {
  return Object.entries(values).every(([key, value]) => {
    const field = definition.fields[key];
    if (!field) return false;
    if (field.type === 'boolean') return typeof value === 'boolean';
    if (field.type === 'number')
      return (
        typeof value === 'number' &&
        value >= (field.min ?? -Infinity) &&
        value <= (field.max ?? Infinity)
      );
    return typeof value === 'string' && (field.type !== 'color' || /^#[0-9a-fA-F]{6}$/.test(value));
  });
}
