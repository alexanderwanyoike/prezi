import { createHash } from 'node:crypto';
import { createProject, editRequestSchema } from '../../shared/project';
import type { Project, ProjectSnapshot } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export class ProjectOwner {
  private project: Project = createProject();

  private revision = 0;
  private past: Project[] = [];
  private future: Project[] = [];

  private dirty = false;

  private requests = new Map<string, { fingerprint: string; snapshot: ProjectSnapshot }>();
  private listeners = new Set<(snapshot: ProjectSnapshot) => void>();

  snapshot(): ProjectSnapshot {
    return {
      project: structuredClone(this.project),
      revision: this.revision,
      dirty: this.dirty,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      filePath: null,
    };
  }

  subscribe(listener: (snapshot: ProjectSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  undo(expectedRevision: number): Result<ProjectSnapshot> {
    return this.restoreHistory(expectedRevision, this.past, this.future);
  }

  redo(expectedRevision: number): Result<ProjectSnapshot> {
    return this.restoreHistory(expectedRevision, this.future, this.past);
  }

  private restoreHistory(
    expectedRevision: number,
    from: Project[],
    to: Project[],
  ): Result<ProjectSnapshot> {
    if (expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed. Read its latest revision and retry.');
    const previous = from.pop();
    if (!previous) return failure('INVALID_INPUT', 'There is no history in that direction.');
    to.push(this.project);
    this.project = previous;
    this.revision += 1;
    this.dirty = true;
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    return { ok: true, value: this.snapshot() };
  }

  edit(input: unknown): Result<ProjectSnapshot> {
    const parsed = editRequestSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'The edit request is invalid.');
    const fingerprint = createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
    const cached = this.requests.get(parsed.data.requestId);
    if (cached) {
      if (cached.fingerprint !== fingerprint)
        return failure('REQUEST_REUSED', 'This request ID already belongs to a different edit.');
      return { ok: true, value: structuredClone(cached.snapshot) };
    }
    if (parsed.data.expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed. Read its latest revision and retry.');
    const draft = structuredClone(this.project);
    const problem = parsed.data.operations.reduce<Result<Project>>(
      (result, operation) => {
        if (!result.ok) return result;
        const slide = result.value.slides.find((item) => item.id === operation.slideId);
        if (!slide) return failure('NOT_FOUND', 'The slide no longer exists.');
        Object.assign(slide, operation.patch);
        return result;
      },
      { ok: true, value: draft },
    );
    if (!problem.ok) return problem;
    this.past.push(this.project);
    this.past = this.past.slice(-50);
    this.future = [];
    this.project = draft;
    this.revision += 1;
    this.dirty = true;
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    const snapshot = this.snapshot();
    this.requests.set(parsed.data.requestId, { fingerprint, snapshot });
    if (this.requests.size > 128) {
      const oldest = this.requests.keys().next().value;
      if (oldest) this.requests.delete(oldest);
    }
    return { ok: true, value: snapshot };
  }
}
