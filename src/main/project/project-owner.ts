import { createProject, editRequestSchema } from '../../shared/project';
import type { Project, ProjectSnapshot } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export class ProjectOwner {
  private project: Project = createProject();

  private revision = 0;

  private dirty = false;

  private listeners = new Set<(snapshot: ProjectSnapshot) => void>();

  snapshot(): ProjectSnapshot {
    return {
      project: structuredClone(this.project),
      revision: this.revision,
      dirty: this.dirty,
      canUndo: false,
      canRedo: false,
      filePath: null,
    };
  }

  subscribe(listener: (snapshot: ProjectSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  edit(input: unknown): Result<ProjectSnapshot> {
    const parsed = editRequestSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'The edit request is invalid.');
    if (parsed.data.expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed. Read its latest revision and retry.');
    const draft = structuredClone(this.project);
    for (const operation of parsed.data.operations) {
      const slide = draft.slides.find((item) => item.id === operation.slideId);
      if (!slide) return failure('NOT_FOUND', 'The slide no longer exists.');
      Object.assign(slide, operation.patch);
    }
    this.project = draft;
    this.revision += 1;
    this.dirty = true;
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    return { ok: true, value: this.snapshot() };
  }
}
