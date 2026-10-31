import { createHash } from 'node:crypto';
import { transitionRequestSchema } from '../../shared/transition';
import type { TransitionRequest } from '../../shared/transition';
import type { TransitionSamples } from '../../shared/transition-style';
import { sceneDefinitionProblem, validSceneValues } from '../../shared/scene-definition';
import type { SceneValues } from '../../shared/scene-definition';
import type { Compilation } from '../../shared/custom-scene';
import type { SceneJob } from '../../shared/scene-jobs';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import type { ProjectOwner } from '../project/project-owner';
import type { RenderWork } from '../source/render-work';

type Outcome = Result<{ revision: number; resources: SceneJob['resources'] }>;
export class TransitionJobs {
  private records = new Map<string, { fingerprint: string; job: SceneJob }>();

  private controllers = new Map<string, AbortController>();

  constructor(
    private readonly owner: ProjectOwner,
    private readonly work: RenderWork,
    private readonly compile: (
      input: TransitionRequest,
      signal: AbortSignal,
    ) => Promise<Compilation>,
    private readonly evaluate: (
      code: string,
      properties: SceneValues,
      signal: AbortSignal,
    ) => Promise<Result<TransitionSamples>>,
  ) {}

  submit(input: unknown): Result<SceneJob> {
    const parsed = transitionRequestSchema.safeParse(input);
    if (!parsed.success)
      return failure('INVALID_INPUT', 'A valid transition compilation request is required.');
    const request = parsed.data;
    const problem = sceneDefinitionProblem({ ...request.candidate, layers: [] });
    if (problem || !validSceneValues(request.candidate, request.properties))
      return failure(
        'INVALID_INPUT',
        problem ?? 'Transition properties must match their declared fields.',
      );
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const existing = this.records.get(request.requestId);
    if (existing)
      return existing.fingerprint === fingerprint
        ? { ok: true, value: structuredClone(existing.job) }
        : failure('REQUEST_REUSED', 'This request ID belongs to another transition job.');
    const snapshot = this.owner.snapshot();
    if (snapshot.revision !== request.expectedRevision)
      return failure('CONFLICT', 'Read the latest revision before compiling.');
    if (
      request.expectedVersion !== undefined &&
      request.expectedVersion !== (snapshot.project.transition?.version ?? null)
    )
      return failure(
        'CONFLICT',
        'The working transition changed. Keep the draft or reload its current source.',
      );
    if (this.controllers.size >= 4)
      return failure('CONFLICT', 'The transition queue is full. Wait for or cancel a job.');
    const job: SceneJob = { id: request.requestId, label: request.label, state: 'queued' };
    const controller = new AbortController();
    this.controllers.set(job.id, controller);
    this.records.set(job.id, { fingerprint, job });
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
          job.error = result.error;
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
      : failure('NOT_FOUND', 'The transition job no longer exists.');
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

  private async execute(request: TransitionRequest, signal: AbortSignal): Promise<Outcome> {
    const cancelled = (): boolean => signal.aborted;
    const compiled = await this.compile(request, signal);
    if (cancelled()) return failure('CANCELLED', 'Transition compilation was cancelled.');
    if (!compiled.ok) return compiled;
    const record = this.records.get(request.requestId);
    if (record) record.job.state = 'validating';
    const properties = {
      ...Object.fromEntries(
        Object.entries(request.candidate.fields).map(([name, field]) => [name, field.default]),
      ),
      ...request.properties,
    };
    const evaluated = await this.evaluate(compiled.value.code, properties, signal);
    if (cancelled()) return failure('CANCELLED', 'Transition evaluation was cancelled.');
    if (!evaluated.ok) return evaluated;
    const accepted = this.owner.edit({
      requestId: request.requestId,
      expectedRevision: request.expectedRevision,
      label: request.label,
      operations: [
        {
          type: 'setTransition',
          definition: {
            ...request.candidate,
            version: crypto.randomUUID(),
            properties: request.properties,
            samples: evaluated.value,
          },
        },
        ...(request.consumeDraft ? [{ type: 'setTransitionDraft' as const, draft: null }] : []),
      ],
    });
    return accepted.ok
      ? {
          ok: true,
          value: { revision: accepted.value.revision, resources: compiled.value.resources },
        }
      : accepted;
  }
}
