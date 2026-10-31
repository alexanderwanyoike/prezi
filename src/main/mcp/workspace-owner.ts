import { workspacePatchSchema } from '../../shared/workspace';
import type { Selection, Workspace } from '../../shared/workspace';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import type { ProjectOwner } from '../project/project-owner';

export class WorkspaceOwner {
  private state: Workspace;

  private listeners = new Set<(selection: Selection) => void>();

  constructor(private readonly project: ProjectOwner) {
    this.state = {
      selection: { slideId: project.snapshot().project.slides[0]?.id ?? '', elementId: null },
      presentation: null,
    };
  }

  snapshot(): Workspace {
    const { slides } = this.project.snapshot().project;
    const selected = slides.find((slide) => slide.id === this.state.selection.slideId) ?? slides[0];
    const selection =
      selected?.id === this.state.selection.slideId
        ? this.state.selection
        : { slideId: selected?.id ?? '', elementId: null };
    const presenting = slides.find((slide) => slide.id === this.state.presentation?.slideId);
    return {
      selection: structuredClone(selection),
      presentation:
        presenting && this.state.presentation
          ? {
              slideId: presenting.id,
              reveal: Math.min(this.state.presentation.reveal, presenting.reveals.length),
            }
          : null,
    };
  }

  publish(input: unknown, external = false): Result<boolean> {
    const parsed = workspacePatchSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'The workspace state is invalid.');
    const { slides } = this.project.snapshot().project;
    const { selection, presentation } = parsed.data;
    if (selection) {
      const slide = slides.find((item) => item.id === selection.slideId);
      const elements = [
        `${selection.slideId}:heading`,
        `${selection.slideId}:body`,
        ...(slide?.media ? [`${selection.slideId}:media`] : []),
      ];
      if (!slide || (selection.elementId !== null && !elements.includes(selection.elementId)))
        return failure('NOT_FOUND', 'The selected slide or element no longer exists.');
    }
    if (presentation) {
      const slide = slides.find((item) => item.id === presentation.slideId);
      if (!slide || presentation.reveal > slide.reveals.length)
        return failure('NOT_FOUND', 'The presentation position no longer exists.');
    }
    Object.assign(this.state, parsed.data);
    if (external && selection)
      this.listeners.forEach((listener) => {
        listener(selection);
      });
    return { ok: true, value: true };
  }

  subscribe(listener: (selection: Selection) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
