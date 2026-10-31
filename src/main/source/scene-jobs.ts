import { createHash } from 'node:crypto';
import { sceneDefinitionProblem } from '../../shared/scene-definition';
import { sceneJobRequestSchema } from '../../shared/scene-jobs';
import type { SceneJob, SceneJobRequest } from '../../shared/scene-jobs';
import type { Result } from '../../shared/result';
import { failure } from '../../shared/result';
import type { ProjectOwner } from '../project/project-owner';
import type { Compilation } from '../../shared/custom-scene';
import { RenderWork } from './render-work';

type Outcome = Result<{ revision: number; resources: SceneJob['resources'] }>;
export class SceneJobs {
  private records = new Map<string, { fingerprint: string; job: SceneJob }>();

  private controllers = new Map<string, AbortController>();

  constructor(
    private readonly owner: ProjectOwner,
    private readonly compile: (input: SceneJobRequest, signal: AbortSignal) => Promise<Compilation>,
    private readonly validate: (
      input: SceneJobRequest,
      code: string,
      signal: AbortSignal,
    ) => Promise<Result<void>>,
    private readonly work = new RenderWork(),
  ) {}

  submit(input: unknown): Result<SceneJob> {
    const parsed = sceneJobRequestSchema.safeParse(input);
    if (!parsed.success)
      return failure('INVALID_INPUT', 'The scene compilation request is invalid.');
    const request = parsed.data;
    if (request.requestId.startsWith('preview:') || request.requestId.startsWith('transition:'))
      return failure('INVALID_INPUT', 'That request ID prefix is reserved for another job type.');
    const problem = sceneDefinitionProblem(request.candidate);
    if (problem) return failure('INVALID_INPUT', problem);
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const existing = this.records.get(request.requestId);
    if (existing)
      return existing.fingerprint === fingerprint
        ? { ok: true, value: structuredClone(existing.job) }
        : failure('REQUEST_REUSED', 'This request ID belongs to another scene job.');
    const snapshot = this.owner.snapshot();
    const boundId = snapshot.project.slides.find((slide) => slide.id === request.slideId)?.scene
      ?.definitionId;
    const version = snapshot.project.scenes?.[boundId ?? '']?.version ?? null;
    if (
      request.expectedDefinitionVersion !== undefined &&
      request.expectedDefinitionVersion !== version
    )
      return failure(
        'CONFLICT',
        'The working scene changed after this draft was created. Keep the draft or reload the current source.',
      );
    if (request.expectedRevision !== snapshot.revision)
      return failure('CONFLICT', 'Read the latest project revision before compiling.');
    if (this.controllers.size >= 4)
      return failure('CONFLICT', 'The scene queue is full. Wait for or cancel a job.');
    const job: SceneJob = { id: request.requestId, label: request.label, state: 'queued' };
    this.records.set(job.id, { fingerprint, job });
    const controller = new AbortController();
    this.controllers.set(job.id, controller);
    void this.work
      .run(
        () => this.execute(request, controller.signal),
        controller.signal,
        () => {
          job.state = 'compiling';
        },
      )
      .then((result) => {
        this.controllers.delete(job.id);
        if (controller.signal.aborted) job.state = 'cancelled';
        else if (result.ok) {
          job.state = 'complete';
          job.revision = result.value.revision;
          job.resources = result.value.resources;
        } else {
          job.state = 'failed';
          job.error = { ...result.error };
        }
        if (this.records.size > 32) {
          const oldest = [...this.records.keys()].find((id) => !this.controllers.has(id));
          if (oldest) this.records.delete(oldest);
        }
      });
    return { ok: true, value: structuredClone(job) };
  }

  read(id: string): Result<SceneJob> {
    const record = this.records.get(id);
    return record
      ? { ok: true, value: structuredClone(record.job) }
      : failure('NOT_FOUND', 'The scene job no longer exists.');
  }

  cancel(id: string): Result<SceneJob> {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
      const record = this.records.get(id);
      if (record) record.job.state = 'cancelled';
    }
    return this.read(id);
  }

  dispose(): void {
    this.controllers.forEach((controller) => {
      controller.abort();
    });
  }

  private async execute(request: SceneJobRequest, signal: AbortSignal): Promise<Outcome> {
    const cancelled = (): boolean => signal.aborted;
    const compiled = await this.compile(request, signal);
    if (cancelled()) return failure('CANCELLED', 'Scene compilation was cancelled.');
    if (!compiled.ok) return compiled;
    const record = this.records.get(request.requestId);
    if (record) record.job.state = 'validating';
    const validated = await this.validate(request, compiled.value.code, signal);
    if (cancelled()) return failure('CANCELLED', 'Scene validation was cancelled.');
    if (!validated.ok) return validated;
    const installed = this.owner.installScene({
      requestId: request.requestId,
      consumeDraft: request.consumeDraft,
      expectedRevision: request.expectedRevision,
      label: request.label,
      slideId: request.slideId,
      definition: { ...request.candidate, code: compiled.value.code },
      properties: request.properties,
    });
    return installed.ok
      ? {
          ok: true,
          value: { revision: installed.value.revision, resources: compiled.value.resources },
        }
      : installed;
  }
}
