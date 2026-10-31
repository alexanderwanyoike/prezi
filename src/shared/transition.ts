import { z } from 'zod';
import {
  sceneCandidateSchema,
  sceneDefinitionProblem,
  sceneValuesSchema,
  validSceneValues,
} from './scene-definition';
import { sceneDraftSchema } from './scene-draft';
import { transitionSamplesSchema } from './transition-style';

export const transitionCandidateSchema = sceneCandidateSchema.omit({ layers: true });
export const transitionDefinitionSchema = transitionCandidateSchema
  .extend({
    version: z.uuid(),
    properties: sceneValuesSchema,
    samples: transitionSamplesSchema,
  })
  .refine(
    (definition) =>
      !sceneDefinitionProblem({ ...definition, layers: [] }) &&
      validSceneValues(definition, definition.properties),
    'Transition fields and properties must be valid.',
  );
export const transitionRequestSchema = z.object({
  requestId: z.string().startsWith('transition:').min(12).max(100),
  expectedRevision: z.number().int().nonnegative(),
  expectedVersion: z.uuid().nullable().optional(),
  consumeDraft: z.boolean().optional(),
  label: z.string().min(1).max(100),
  candidate: transitionCandidateSchema,
  properties: sceneValuesSchema,
});
export const transitionDraftSchema = sceneDraftSchema;
export type TransitionCandidate = z.infer<typeof transitionCandidateSchema>;
export type TransitionDefinition = z.infer<typeof transitionDefinitionSchema>;
export type TransitionRequest = z.infer<typeof transitionRequestSchema>;
