import { z } from 'zod';
import { transitionStyleSchema, transitionSamplesSchema } from '../shared/transition-style';
import type { TransitionInput, TransitionSamples } from '../shared/transition-style';
import type { SceneValues } from '../shared/scene-definition';
import { failure } from '../shared/result';
import type { Result } from '../shared/result';

const moduleSchema = z.object({
  default: z.custom<(input: TransitionInput) => unknown>((value) => typeof value === 'function'),
});
export async function sampleTransition(
  code: string,
  properties: SceneValues,
): Promise<Result<TransitionSamples>> {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  try {
    const input: unknown = await import(/* @vite-ignore */ url);
    const module = moduleSchema.safeParse(input);
    if (!module.success) return failure('INVALID_INPUT', 'Export a default transition function.');
    const sample = (
      navigation: TransitionInput['navigation'],
      direction: TransitionInput['direction'],
    ) =>
      Array.from({ length: 61 }, (_value, index) =>
        transitionStyleSchema.parse(
          module.data.default({
            progress: index / 60,
            direction,
            navigation,
            props: structuredClone(properties),
          }),
        ),
      );
    const samples = transitionSamplesSchema.safeParse({
      advance: { entering: sample('advance', 'entering'), exiting: sample('advance', 'exiting') },
      back: { entering: sample('back', 'entering'), exiting: sample('back', 'exiting') },
    });
    return samples.success
      ? { ok: true, value: samples.data }
      : failure(
          'INVALID_INPUT',
          samples.error.issues[0]?.message ??
            'The transition did not finish at the normal slide state.',
        );
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error
        ? error.message.slice(0, 2000)
        : 'The transition could not be evaluated.',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
