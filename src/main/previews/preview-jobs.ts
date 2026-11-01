import { createHash } from 'node:crypto';
import { previewImageSchema, previewKey, previewRequestSchema } from '../../shared/preview';
import type { PreviewJob, PreviewImage } from '../../shared/preview';
import type { Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import type { ProjectOwner } from '../project/project-owner';
import type { RenderWork } from '../source/render-work';

export class PreviewJobs {
  private records = new Map<string, { fingerprint: string; job: PreviewJob }>();

  private controllers = new Map<string, AbortController>();

  private listeners = new Set<(job: PreviewJob) => void>();

  constructor(
    private readonly owner: ProjectOwner,
    private readonly work: RenderWork,
    private readonly capture: (
      project: Project,
      slideId: string,
      reveal: number,
      signal: AbortSignal,
    ) => Promise<Result<PreviewImage>>,
  ) {}

  submit(input: unknown): Result<PreviewJob> {
    const parsed = previewRequestSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'A valid preview request is required.');
    const request = parsed.data;
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const existing = this.records.get(request.requestId);
    if (existing)
      return existing.fingerprint === fingerprint
        ? { ok: true, value: structuredClone(existing.job) }
        : failure('REQUEST_REUSED', 'This request ID belongs to another preview.');
    const snapshot = this.owner.snapshot();
    if (snapshot.revision !== request.expectedRevision)
      return failure('CONFLICT', 'Read the latest project revision before capturing.');
    const slide = snapshot.project.slides.find((item) => item.id === request.slideId);
    if (!slide) return failure('NOT_FOUND', 'The slide no longer exists.');
    if (request.reveal > slide.reveals.length)
      return failure('INVALID_INPUT', 'That reveal does not exist.');
    if (this.controllers.size >= 4)
      return failure('CONFLICT', 'The preview queue is full. Wait for or cancel a job.');
    const job: PreviewJob = {
      id: request.requestId,
      slideId: slide.id,
      key: previewKey(snapshot.project, slide),
      revision: snapshot.revision,
      state: 'queued',
    };
    const controller = new AbortController();
    this.controllers.set(job.id, controller);
    this.records.set(job.id, { fingerprint, job });
    this.trim();
    void this.work
      .run(
        () => this.capture(snapshot.project, slide.id, request.reveal, controller.signal),
        controller.signal,
        () => {
          job.state = 'rendering';
        },
      )
      .then((result) => {
        this.controllers.delete(job.id);
        const image = result.ok ? previewImageSchema.safeParse(result.value) : null;
        if (controller.signal.aborted) job.state = 'cancelled';
        else if (image?.success) {
          job.state = 'complete';
          job.image = image.data;
        } else {
          job.state = 'failed';
          job.error = result.ok
            ? { code: 'IO_ERROR', message: 'The preview image exceeded its bounds.' }
            : result.error;
        }
        this.trim();
        this.listeners.forEach((listener) => {
          listener(structuredClone(job));
        });
      });
    return { ok: true, value: structuredClone(job) };
  }

  list(): PreviewJob[] {
    return [...this.records.values()].map(({ job }) => structuredClone(job));
  }

  subscribe(listener: (job: PreviewJob) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  read(id: string): Result<PreviewJob> {
    const record = this.records.get(id);
    return record
      ? { ok: true, value: structuredClone(record.job) }
      : failure('NOT_FOUND', 'The preview job no longer exists.');
  }

  cancel(id: string): Result<PreviewJob> {
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
    this.listeners.clear();
  }

  private trim(): void {
    let bytes = [...this.records.values()].reduce(
      (total, { job }) => total + (job.image?.dataUrl.length ?? 0),
      0,
    );
    [...this.records.entries()].forEach(([id, { job }]) => {
      if ((this.records.size > 16 || bytes > 4 * 1024 * 1024) && !this.controllers.has(id)) {
        bytes -= job.image?.dataUrl.length ?? 0;
        this.records.delete(id);
      }
    });
  }
}
