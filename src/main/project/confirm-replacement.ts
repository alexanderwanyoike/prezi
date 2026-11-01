import type { ProjectOwner } from './project-owner';
import type { ProjectSnapshot } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function confirmReplacement(
  owner: ProjectOwner,
  choose: () => Promise<number>,
  save: () => Promise<Result<ProjectSnapshot>>,
): Promise<Result<void>> {
  if (!owner.snapshot().dirty) return { ok: true, value: undefined };
  const choice = await choose();
  if (choice === 2) return failure('CANCELLED', 'The current presentation remains open.');
  if (choice === 0) {
    const result = await save();
    if (!result.ok) return result;
    if (owner.snapshot().dirty)
      return failure(
        'CONFLICT',
        'The presentation changed while saving. Save again before closing.',
      );
  }
  return { ok: true, value: undefined };
}
