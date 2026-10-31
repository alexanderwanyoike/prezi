import { z } from 'zod';
import { createHash } from 'node:crypto';
import { AssetStore } from '../media/asset-store';
import { readProject, writeProject } from './project-files';
import { applyOperation } from './apply-operation';
import { createProject, editRequestSchema } from '../../shared/project';
import type { Project, ProjectSnapshot } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export class ProjectOwner {
  private readonly assets = new AssetStore();

  mediaPath(id: string): string | undefined {
    return this.project.slides.some((slide) => slide.media?.id === id)
      ? this.assets.path(id)
      : undefined;
  }

  async dispose(): Promise<void> {
    await this.assets.dispose();
  }

  async importMedia(
    path: string,
    slideId: string,
    expectedRevision: number,
  ): Promise<Result<ProjectSnapshot>> {
    if (this.fileBusy || expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed or a file operation is running.');
    if (
      !z.uuid().safeParse(slideId).success ||
      !this.project.slides.some((slide) => slide.id === slideId)
    )
      return failure('NOT_FOUND', 'The slide no longer exists.');
    const imported = await this.assets.import(path);
    if (!imported.ok) return imported;
    return this.edit({
      requestId: crypto.randomUUID(),
      expectedRevision,
      label: 'Import media',
      operations: [{ type: 'updateSlide', slideId, patch: { media: imported.value } }],
    });
  }

  private project: Project = createProject();

  private revision = 0;

  private past: Project[] = [];

  private future: Project[] = [];

  private savedContent = JSON.stringify(this.project);

  private filePath: string | null = null;

  private fileBusy = false;

  private requests = new Map<string, { fingerprint: string; snapshot: ProjectSnapshot }>();

  private listeners = new Set<(snapshot: ProjectSnapshot) => void>();

  snapshot(): ProjectSnapshot {
    return {
      project: structuredClone(this.project),
      revision: this.revision,
      dirty: JSON.stringify(this.project) !== this.savedContent,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      filePath: this.filePath,
    };
  }

  subscribe(listener: (snapshot: ProjectSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(expectedRevision: number): Result<ProjectSnapshot> {
    if (this.fileBusy || expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed or a file operation is running.');
    this.project = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name: 'Untitled presentation',
      slides: [
        {
          id: crypto.randomUUID(),
          title: 'Untitled slide',
          body: '',
          layout: 'title',
          reveals: [],
        },
      ],
    };
    this.savedContent = JSON.stringify(this.project);
    this.filePath = null;
    this.revision += 1;
    this.past = [];
    this.future = [];
    this.requests.clear();
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    return { ok: true, value: this.snapshot() };
  }

  async save(path: string): Promise<Result<ProjectSnapshot>> {
    if (this.fileBusy) return failure('CONFLICT', 'Another file operation is still running.');
    this.fileBusy = true;
    const project = structuredClone(this.project);
    try {
      const media = project.slides.flatMap((slide) => (slide.media ? [slide.media] : []));
      const copied = await this.assets.save(path, media);
      if (!copied.ok) return copied;
      const result = await writeProject(path, project);
      if (!result.ok) return result;
      this.savedContent = JSON.stringify(project);
      this.filePath = path;
      this.assets.remember(path, media);
      this.listeners.forEach((listener) => {
        listener(this.snapshot());
      });
      return { ok: true, value: this.snapshot() };
    } finally {
      this.fileBusy = false;
    }
  }

  async open(path: string, expectedRevision: number): Promise<Result<ProjectSnapshot>> {
    if (this.fileBusy || expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed or another file operation is running.');
    this.fileBusy = true;
    try {
      const result = await readProject(path);
      if (!result.ok) return result;
      if (expectedRevision !== this.revision)
        return failure('CONFLICT', 'The project was edited while opening. Try again.');
      this.project = result.value;
      this.assets.remember(
        path,
        this.project.slides.flatMap((slide) => (slide.media ? [slide.media] : [])),
      );
      this.savedContent = JSON.stringify(this.project);
      this.filePath = path;
      this.revision += 1;
      this.past = [];
      this.future = [];
      this.requests.clear();
      this.listeners.forEach((listener) => {
        listener(this.snapshot());
      });
      return { ok: true, value: this.snapshot() };
    } finally {
      this.fileBusy = false;
    }
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
      (result, operation) => (result.ok ? applyOperation(result.value, operation) : result),
      { ok: true, value: draft },
    );
    if (!problem.ok) return problem;
    this.past.push(this.project);
    this.past = this.past.slice(-50);
    this.future = [];
    this.project = draft;
    this.revision += 1;
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
