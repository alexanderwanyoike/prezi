import { z } from 'zod';
import type { SceneValues } from './scene-definition';

export const transitionStyleSchema = z
  .object({
    opacity: z.number().min(0).max(1).default(1),
    x: z.number().min(-200).max(200).default(0),
    y: z.number().min(-200).max(200).default(0),
    scale: z.number().min(0.1).max(4).default(1),
    rotate: z.number().min(-360).max(360).default(0),
    blur: z.number().min(0).max(24).default(0),
    clipTop: z.number().min(0).max(100).default(0),
    clipRight: z.number().min(0).max(100).default(0),
    clipBottom: z.number().min(0).max(100).default(0),
    clipLeft: z.number().min(0).max(100).default(0),
  })
  .strict();
const frames = z.array(transitionStyleSchema).length(61);
const pair = z.object({ entering: frames, exiting: frames });
const identity = transitionStyleSchema.parse({});
function normal(style: z.infer<typeof transitionStyleSchema> | undefined): boolean {
  return (
    !!style &&
    Object.entries(identity).every(
      ([key, value]) => Math.abs(style[key as keyof typeof style] - value) < 0.000001,
    )
  );
}
export const transitionSamplesSchema = z
  .object({ advance: pair, back: pair })
  .superRefine((samples, context) => {
    (['advance', 'back'] as const).forEach((navigation) => {
      if (!normal(samples[navigation].entering[60]) || !normal(samples[navigation].exiting[0]))
        context.addIssue({
          code: 'custom',
          message:
            'Entering transitions must finish at the normal slide state; exiting transitions must start there.',
          path: [navigation],
        });
    });
  });
export type TransitionStyle = z.infer<typeof transitionStyleSchema>;
export type TransitionSamples = z.infer<typeof transitionSamplesSchema>;
export interface TransitionInput {
  progress: number;
  direction: 'entering' | 'exiting';
  navigation: 'advance' | 'back';
  props: SceneValues;
}
