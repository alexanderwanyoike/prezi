import { z } from 'zod';
import { rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assetCreditSchema } from '../../shared/asset-credit';
import type { AssetCredit } from '../../shared/asset-credit';
import { fontCreditSchema } from '../../shared/fonts';
import type { FontCredit } from '../../shared/fonts';
import { projectAssets } from '../../shared/project-assets';
import { withoutSceneDraft } from '../../shared/scene-draft';
import { sceneInstallationSchema } from '../../shared/scene-definition';
import type { SceneInstallation } from '../../shared/scene-definition';
import { readArchive } from '../archive/read-archive';
import { writeArchive } from '../archive/write-archive';
import { AssetStore } from '../media/asset-store';
import { readProject, writeProject } from './project-files';
import { applyOperation } from './apply-operation';
import { createProject, editRequestSchema, projectSchema } from '../../shared/project';
import type { Project, ProjectSnapshot } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

interface HistoryEntry {
  project: Project;
  label: string;
}

export class ProjectOwner {
  constructor(exampleVideoPath?: string) {
    const slide = this.project.slides[2];
    if (exampleVideoPath && slide) {
      const media = {
        id: crypto.randomUUID(),
        name: 'Vibez / playback example',
        kind: 'video' as const,
        extension: 'webm' as const,
        loop: true,
        muted: true,
      };
      slide.media = media;
      this.assets.register(media.id, exampleVideoPath);
      this.savedContent = JSON.stringify(this.project);
    }
  }

  installScene(input: SceneInstallation): Result<ProjectSnapshot> {
    const parsed = sceneInstallationSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'The scene definition is invalid.');
    const request = parsed.data;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ kind: 'installScene', ...request }))
      .digest('hex');
    const cached = this.requests.get(request.requestId);
    if (cached)
      return cached.fingerprint === fingerprint
        ? { ok: true, value: structuredClone(cached.snapshot) }
        : failure('REQUEST_REUSED', 'This request ID belongs to a different change.');
    if (this.pendingImports.has(request.requestId))
      return failure('REQUEST_REUSED', 'This request ID belongs to an import.');
    if (this.restarting || request.expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed while compiling. Read it and apply again.');
    if (!this.project.slides.some((slide) => slide.id === request.slideId))
      return failure('NOT_FOUND', 'The slide no longer exists.');
    const { drafts: currentDrafts, ...content } = this.project;
    const drafts = request.consumeDraft
      ? withoutSceneDraft(currentDrafts, request.slideId)
      : currentDrafts;
    const draft: Project = {
      ...content,
      ...(drafts ? { drafts } : {}),
      scenes: {
        ...this.project.scenes,
        [request.definition.id]: { ...request.definition, version: crypto.randomUUID() },
      },
      slides: this.project.slides.map((slide) =>
        slide.id === request.slideId
          ? {
              ...slide,
              scene: { definitionId: request.definition.id, properties: request.properties },
            }
          : slide,
      ),
    };
    if (!projectSchema.safeParse(draft).success)
      return failure('INVALID_INPUT', 'The scene properties do not match its definition.');
    if (Buffer.byteLength(JSON.stringify(draft, null, 2)) > 8 * 1024 * 1024)
      return failure('INVALID_INPUT', 'The project exceeds its 8 MiB content budget.');
    this.past.push({ project: this.project, label: request.label });
    this.past = this.past.slice(-50);
    this.future = [];
    this.project = draft;
    this.revision += 1;
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    const snapshot = this.snapshot();
    this.remember(request.requestId, fingerprint, snapshot);
    return { ok: true, value: snapshot };
  }

  private restarting = false;

  beginRestart(): Result<() => void> {
    if (this.restarting || this.fileBusy || this.pendingImports.size > 0)
      return failure('CONFLICT', 'Wait for the current operation before restarting.');
    this.restarting = true;
    return {
      ok: true,
      value: () => {
        this.restarting = false;
      },
    };
  }

  private readonly assets = new AssetStore();

  mediaPath(id: string): string | undefined {
    return projectAssets(this.project).some((asset) => asset.id === id)
      ? this.assets.path(id)
      : undefined;
  }

  async dispose(): Promise<void> {
    await this.assets.dispose();
  }

  private pendingImports = new Map<
    string,
    { fingerprint: string; result: Promise<Result<ProjectSnapshot>> }
  >();

  async importMedia(
    path: string,
    slideId: string,
    expectedRevision: number,
    requestId?: string,
    credit: AssetCredit = {},
    replace = false,
  ): Promise<Result<ProjectSnapshot>> {
    const metadata = assetCreditSchema.safeParse(credit);
    if (!metadata.success) return failure('INVALID_INPUT', 'The media credits are invalid.');
    const id = requestId ?? crypto.randomUUID();
    if (!z.string().min(1).max(100).safeParse(id).success)
      return failure('INVALID_INPUT', 'A valid import request ID is required.');
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          kind: 'importMedia',
          path,
          slideId,
          expectedRevision,
          credit: metadata.data,
          replace,
        }),
      )
      .digest('hex');
    const cached = this.requests.get(id);
    if (cached)
      return cached.fingerprint === fingerprint
        ? { ok: true, value: structuredClone(cached.snapshot) }
        : failure('REQUEST_REUSED', 'This request ID already belongs to a different edit.');
    const pending = this.pendingImports.get(id);
    if (pending)
      return pending.fingerprint === fingerprint
        ? pending.result
        : failure('REQUEST_REUSED', 'This request ID already belongs to a different import.');
    if (
      this.restarting ||
      this.fileBusy ||
      this.pendingImports.size > 0 ||
      expectedRevision !== this.revision
    )
      return failure('CONFLICT', 'The project changed or a file operation is running.');
    if (
      !z.uuid().safeParse(slideId).success ||
      !this.project.slides.some((slide) => slide.id === slideId)
    )
      return failure('NOT_FOUND', 'The slide no longer exists.');
    const previous = this.project.slides.find((slide) => slide.id === slideId)?.media;
    if (replace && !previous) return failure('NOT_FOUND', 'This slide has no media to replace.');
    const run = async (): Promise<Result<ProjectSnapshot>> => {
      const imported = await this.assets.import(path);
      if (!imported.ok) return imported;
      if (replace && previous && previous.kind !== imported.value.kind)
        return failure('INVALID_INPUT', `Choose a replacement ${previous.kind} file.`);
      const media = { ...(replace ? previous : {}), ...imported.value, ...metadata.data };
      const result = this.edit({
        requestId: crypto.randomUUID(),
        expectedRevision,
        label: `${requestId ? 'Agent: ' : ''}${replace ? 'Locate media' : 'Import media'}`,
        operations: [{ type: 'updateSlide', slideId, patch: { media } }],
      });
      if (result.ok) this.remember(id, fingerprint, result.value);
      return result;
    };
    const result = run();
    this.pendingImports.set(id, { fingerprint, result });
    try {
      return await result;
    } finally {
      this.pendingImports.delete(id);
    }
  }

  async importFont(
    path: string,
    expectedRevision: number,
    requestId: string = crypto.randomUUID(),
    input: FontCredit = {},
    replaceFontId: string | null = null,
  ): Promise<Result<ProjectSnapshot>> {
    const parsed = fontCreditSchema.safeParse(input);
    if (!parsed.success || !z.string().min(1).max(100).safeParse(requestId).success)
      return failure('INVALID_INPUT', 'The font import metadata is invalid.');
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          kind: 'importFont',
          path,
          expectedRevision,
          credit: parsed.data,
          replaceFontId,
        }),
      )
      .digest('hex');
    const cached = this.requests.get(requestId);
    if (cached)
      return cached.fingerprint === fingerprint
        ? { ok: true, value: structuredClone(cached.snapshot) }
        : failure('REQUEST_REUSED', 'This request ID belongs to a different change.');
    const pending = this.pendingImports.get(requestId);
    if (pending)
      return pending.fingerprint === fingerprint
        ? pending.result
        : failure('REQUEST_REUSED', 'This request ID belongs to a different import.');
    if (
      this.restarting ||
      this.fileBusy ||
      this.pendingImports.size ||
      expectedRevision !== this.revision
    )
      return failure('CONFLICT', 'The project changed or a file operation is running.');
    const previous = this.project.fonts?.find((font) => font.id === replaceFontId);
    if (replaceFontId !== null && !previous)
      return failure('NOT_FOUND', 'The font no longer exists.');
    if (!previous && (this.project.fonts?.length ?? 0) >= 16)
      return failure('INVALID_INPUT', 'A project supports up to 16 imported fonts.');
    const run = async (): Promise<Result<ProjectSnapshot>> => {
      const imported = await this.assets.importFont(
        path,
        fontCreditSchema.parse({ ...previous, ...parsed.data }),
      );
      if (!imported.ok) return imported;
      const result = this.edit({
        requestId: crypto.randomUUID(),
        expectedRevision,
        label: previous ? 'Locate font' : 'Import font',
        operations: [
          previous
            ? { type: 'replaceFont', fontId: previous.id, font: imported.value }
            : { type: 'addFont', font: imported.value },
        ],
      });
      if (result.ok) this.remember(requestId, fingerprint, result.value);
      return result;
    };
    this.fileBusy = true;
    const result = run();
    this.pendingImports.set(requestId, { fingerprint, result });
    try {
      return await result;
    } finally {
      this.pendingImports.delete(requestId);
      this.fileBusy = false;
    }
  }

  private project: Project = createProject();

  private revision = 0;

  private past: HistoryEntry[] = [];

  private future: HistoryEntry[] = [];

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
      undoLabel: this.past.at(-1)?.label ?? null,
      redoLabel: this.future.at(-1)?.label ?? null,
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
    if (this.restarting || this.fileBusy || expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed or a file operation is running.');
    this.project = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name: 'Untitled presentation',
      slides: [
        {
          id: crypto.randomUUID(),
          title: '',
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
    if (this.restarting || this.fileBusy)
      return failure('CONFLICT', 'Another file operation or restart is still running.');
    this.fileBusy = true;
    const project = structuredClone(this.project);
    try {
      const media = projectAssets(project);
      let result: Result<void>;
      if (path.toLowerCase().endsWith('.prezi')) {
        result = await writeArchive(path, project, (id) => this.assets.path(id));
      } else {
        const copied = await this.assets.save(path, media);
        if (!copied.ok) return copied;
        result = await writeProject(path, project);
      }
      if (!result.ok) return result;
      this.savedContent = JSON.stringify(project);
      this.filePath = path;
      if (!path.toLowerCase().endsWith('.prezi')) this.assets.remember(path, media);
      this.listeners.forEach((listener) => {
        listener(this.snapshot());
      });
      return { ok: true, value: this.snapshot() };
    } finally {
      this.fileBusy = false;
    }
  }

  async open(path: string, expectedRevision: number): Promise<Result<ProjectSnapshot>> {
    if (this.restarting || this.fileBusy || expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed or another file operation is running.');
    this.fileBusy = true;
    try {
      let project: Project;
      if (path.toLowerCase().endsWith('.prezi')) {
        const archived = await readArchive(path);
        if (!archived.ok) return archived;
        if (expectedRevision !== this.revision) {
          await rm(archived.value.directory, { recursive: true, force: true });
          return failure('CONFLICT', 'The project was edited while opening. Try again.');
        }
        project = archived.value.project;
        this.assets.adopt(archived.value.directory, archived.value.assets);
      } else {
        const result = await readProject(path);
        if (!result.ok) return result;
        if (expectedRevision !== this.revision)
          return failure('CONFLICT', 'The project was edited while opening. Try again.');
        project = result.value;
        this.assets.remember(path, projectAssets(project));
      }
      this.project = project;
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

  undo(expectedRevision: number, requestId?: string): Result<ProjectSnapshot> {
    return this.restoreHistory(expectedRevision, this.past, this.future, 'undo', requestId);
  }

  redo(expectedRevision: number, requestId?: string): Result<ProjectSnapshot> {
    return this.restoreHistory(expectedRevision, this.future, this.past, 'redo', requestId);
  }

  private restoreHistory(
    expectedRevision: number,
    from: HistoryEntry[],
    to: HistoryEntry[],
    direction: 'undo' | 'redo',
    requestId: string = crypto.randomUUID(),
  ): Result<ProjectSnapshot> {
    if (!z.string().min(1).max(100).safeParse(requestId).success)
      return failure('INVALID_INPUT', 'The history request ID is invalid.');
    if (this.pendingImports.has(requestId))
      return failure('REQUEST_REUSED', 'This request ID belongs to a pending import.');
    const fingerprint = JSON.stringify({ direction, expectedRevision });
    const cached = this.requests.get(requestId);
    if (cached) {
      if (cached.fingerprint !== fingerprint)
        return failure('REQUEST_REUSED', 'This request ID already belongs to a different edit.');
      return { ok: true, value: structuredClone(cached.snapshot) };
    }
    if (this.restarting || expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed. Read its latest revision and retry.');
    const previous = from.pop();
    if (!previous) return failure('INVALID_INPUT', 'There is no history in that direction.');
    to.push({ project: this.project, label: previous.label });
    this.project = previous.project;
    this.revision += 1;
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    const snapshot = this.snapshot();
    this.remember(requestId, fingerprint, snapshot);
    return { ok: true, value: snapshot };
  }

  edit(input: unknown): Result<ProjectSnapshot> {
    const parsed = editRequestSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'The edit request is invalid.');
    if (this.pendingImports.has(parsed.data.requestId))
      return failure('REQUEST_REUSED', 'This request ID belongs to a pending import.');
    const fingerprint = createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
    const cached = this.requests.get(parsed.data.requestId);
    if (cached) {
      if (cached.fingerprint !== fingerprint)
        return failure('REQUEST_REUSED', 'This request ID already belongs to a different edit.');
      return { ok: true, value: structuredClone(cached.snapshot) };
    }
    if (this.restarting || parsed.data.expectedRevision !== this.revision)
      return failure('CONFLICT', 'The project changed. Read its latest revision and retry.');
    const problem = parsed.data.operations.reduce<Result<Project>>(
      (result, operation) => (result.ok ? applyOperation(result.value, operation) : result),
      { ok: true, value: this.project },
    );
    if (!problem.ok) return problem;
    if (Buffer.byteLength(JSON.stringify(problem.value, null, 2)) > 8 * 1024 * 1024)
      return failure('INVALID_INPUT', 'The project exceeds its 8 MiB content budget.');
    this.past.push({ project: this.project, label: parsed.data.label });
    this.past = this.past.slice(-50);
    this.future = [];
    this.project = problem.value;
    this.revision += 1;
    this.listeners.forEach((listener) => {
      listener(this.snapshot());
    });
    const snapshot = this.snapshot();
    this.remember(parsed.data.requestId, fingerprint, snapshot);
    return { ok: true, value: snapshot };
  }

  private remember(requestId: string, fingerprint: string, snapshot: ProjectSnapshot): void {
    this.requests.set(requestId, { fingerprint, snapshot: { ...snapshot, project: this.project } });
    if (this.requests.size > 128) {
      const oldest = this.requests.keys().next().value;
      if (oldest) this.requests.delete(oldest);
    }
  }
}
