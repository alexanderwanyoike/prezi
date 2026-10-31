import { projectSchema } from '../../shared/project';
import type { EditOperation, Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function applyOperation(project: Project, operation: EditOperation): Result<Project> {
  if (operation.type === 'renameProject') {
    Object.assign(project, { name: operation.name });
  } else if (operation.type === 'addSlide') {
    if (operation.index > project.slides.length)
      return failure('INVALID_INPUT', 'The insertion position is outside the deck.');
    project.slides.splice(operation.index, 0, operation.slide);
  } else {
    const index = project.slides.findIndex((slide) => slide.id === operation.slideId);
    const slide = project.slides[index];
    if (!slide) return failure('NOT_FOUND', 'The slide no longer exists.');
    switch (operation.type) {
      case 'updateSlide':
        Object.assign(slide, operation.patch);
        break;
      case 'duplicateSlide':
        project.slides.splice(index + 1, 0, { ...structuredClone(slide), id: operation.newId });
        break;
      case 'deleteSlide':
        project.slides.splice(index, 1);
        break;
      case 'moveSlide': {
        if (operation.index >= project.slides.length)
          return failure('INVALID_INPUT', 'The destination is outside the deck.');
        project.slides.splice(index, 1);
        project.slides.splice(operation.index, 0, slide);
        break;
      }
      default:
        break;
    }
  }
  if (
    !projectSchema.safeParse(project).success ||
    new Set(project.slides.map((slide) => slide.id)).size !== project.slides.length
  ) {
    return failure('INVALID_INPUT', 'A deck needs 1 to 200 slides with unique IDs.');
  }
  return { ok: true, value: project };
}
