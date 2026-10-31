import type { z } from 'zod';
import { transitionMetadataSchema } from '../../shared/transition';
import type { TransitionDefinition } from '../../shared/transition';
import type { SceneDraft } from '../../shared/scene-draft';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function createTransitionDraft(definition: TransitionDefinition | undefined): SceneDraft {
  return {
    definitionId: definition?.id ?? crypto.randomUUID(),
    baseVersion: definition?.version ?? null,
    entry: definition?.source.entry ?? 'Transition.tsx',
    files: definition
      ? { ...definition.source.files }
      : {
          'Transition.tsx': `import {Easing} from 'remotion';
import type {TransitionProps, TransitionStyle} from 'prezi';

export default function transition({progress, direction, navigation, props}: TransitionProps): TransitionStyle {
  const eased = Easing.inOut(Easing.cubic)(progress);
  const sign = navigation === 'advance' ? 1 : -1;
  return {
    opacity: direction === 'entering' ? eased : 1,
    x: sign * props.distance * (direction === 'entering' ? 1 - eased : -eased),
  };
}
`,
        },
    metadata: JSON.stringify(
      {
        name: definition?.name ?? 'Transition',
        fields: definition?.fields ?? {
          distance: { type: 'number', label: 'Distance (%)', default: 4, min: 0, max: 100 },
        },
        properties: definition?.properties ?? {},
      },
      null,
      2,
    ),
  };
}
export function readTransitionMetadata(
  text: string,
): Result<z.infer<typeof transitionMetadataSchema>> {
  try {
    const input: unknown = JSON.parse(text);
    const parsed = transitionMetadataSchema.safeParse(input);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : failure(
          'INVALID_INPUT',
          `definition.json: ${parsed.error.issues[0]?.message ?? 'Invalid transition definition.'}`,
        );
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      `definition.json: ${error instanceof Error ? error.message : 'Invalid JSON.'}`,
    );
  }
}
