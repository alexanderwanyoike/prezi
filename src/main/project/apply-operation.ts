import { projectSchema, slideSchema } from '../../shared/project';
import type { EditOperation, Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function applyOperation(project: Project, operation: EditOperation): Result<Project> {
  let next = project;
  if (operation.type === 'renameProject') {
    next = { ...project, name: operation.name };
  } else if (operation.type === 'addSlide') {
    if (operation.index > project.slides.length)
      return failure('INVALID_INPUT', 'The insertion position is outside the deck.');
    const slides = [...project.slides];
    slides.splice(operation.index, 0, operation.slide);
    next = { ...project, slides };
  } else {
    const index = project.slides.findIndex((slide) => slide.id === operation.slideId);
    const slide = project.slides[index];
    if (!slide) return failure('NOT_FOUND', 'The slide no longer exists.');
    const slides = [...project.slides];
    switch (operation.type) {
      case 'updateSlide': {
        const updated = slideSchema.safeParse({ ...slide, ...operation.patch });
        if (!updated.success) return failure('INVALID_INPUT', 'The slide properties are invalid.');
        slides[index] = updated.data;
        break;
      }
      case 'updateMedia':
        if (!slide.media) return failure('NOT_FOUND', 'This slide has no media to edit.');
        slides[index] = { ...slide, media: { ...slide.media, ...operation.patch } };
        break;
      case 'duplicateSlide':
        slides.splice(index + 1, 0, { ...slide, id: operation.newId });
        break;
      case 'deleteSlide':
        slides.splice(index, 1);
        break;
      case 'moveSlide': {
        if (operation.index >= slides.length)
          return failure('INVALID_INPUT', 'The destination is outside the deck.');
        slides.splice(index, 1);
        slides.splice(operation.index, 0, slide);
        break;
      }
      default:
        break;
    }
    next = { ...project, slides };
  }
  if (
    !projectSchema.safeParse(next).success ||
    new Set(next.slides.map((slide) => slide.id)).size !== next.slides.length
  ) {
    return failure('INVALID_INPUT', 'A deck needs 1 to 200 slides with unique IDs.');
  }
  return { ok: true, value: next };
}
