import type { SceneJob, SceneJobRequest } from '../../shared/scene-jobs';
import type { Result } from '../../shared/result';
import { failure } from '../../shared/result';
import type { ProjectOwner } from '../project/project-owner';
import type { Compilation } from '../../shared/custom-scene';

export class SceneJobs {
  constructor(
    _owner: ProjectOwner,
    _compile: (input: SceneJobRequest, signal: AbortSignal) => Promise<Compilation>,
    _validate: (input: SceneJobRequest, code: string, signal: AbortSignal) => Promise<Result<void>>,
  ) {}

  submit(_input: unknown): Result<SceneJob> {
    return failure('INVALID_INPUT', 'Scene jobs are unavailable.');
  }

  read(_id: string): Result<SceneJob> {
    return failure('NOT_FOUND', 'The job does not exist.');
  }

  cancel(_id: string): Result<SceneJob> {
    return failure('NOT_FOUND', 'The job does not exist.');
  }
}
