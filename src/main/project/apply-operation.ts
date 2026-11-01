import { presentationTheme, presentationThemeSchema } from '../../shared/presentation-theme';
import { mediaFrame, mediaSchema } from '../../shared/media';
import { withoutSceneDraft } from '../../shared/scene-draft';
import { projectSchema, slideSchema } from '../../shared/project';
import type { EditOperation, Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function applyOperation(project: Project, operation: EditOperation): Result<Project> {
  let next = project;
  if (operation.type === 'renameProject') {
    next = { ...project, name: operation.name };
  } else if (operation.type === 'setTransition') {
    next = { ...project };
    if (operation.definition) next.transition = operation.definition;
    else delete next.transition;
  } else if (operation.type === 'setTransitionDraft') {
    next = { ...project };
    if (operation.draft) next.transitionDraft = operation.draft;
    else delete next.transitionDraft;
  } else if (operation.type === 'addFont') {
    next = { ...project, fonts: [...(project.fonts ?? []), operation.font] };
  } else if (operation.type === 'replaceFont') {
    if (!project.fonts?.some((font) => font.id === operation.fontId))
      return failure('NOT_FOUND', 'The font no longer exists.');
    if (operation.font.id === operation.fontId)
      return failure('INVALID_INPUT', 'Replacement fonts need a new resource identity.');
    next = {
      ...project,
      fonts: project.fonts.map((font) => (font.id === operation.fontId ? operation.font : font)),
      ...(project.theme
        ? {
            theme: {
              ...project.theme,
              bodyFont:
                project.theme.bodyFont === operation.fontId
                  ? operation.font.id
                  : project.theme.bodyFont,
              monoFont:
                project.theme.monoFont === operation.fontId
                  ? operation.font.id
                  : project.theme.monoFont,
            },
          }
        : {}),
    };
  } else if (operation.type === 'updateFont') {
    if (!project.fonts?.some((font) => font.id === operation.fontId))
      return failure('NOT_FOUND', 'The font no longer exists.');
    next = {
      ...project,
      fonts: project.fonts.map((font) =>
        font.id === operation.fontId
          ? { ...font, ...operation.patch, name: operation.patch.name ?? font.name }
          : font,
      ),
    };
  } else if (operation.type === 'setTheme') {
    const theme = presentationThemeSchema.safeParse({
      ...presentationTheme(project.theme),
      ...operation.patch,
    });
    if (!theme.success) return failure('INVALID_INPUT', 'The presentation theme is invalid.');
    next = { ...project, theme: theme.data };
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
    const { drafts: initialDrafts, ...content } = project;
    let drafts = initialDrafts;
    switch (operation.type) {
      case 'setSceneDraft':
        drafts = operation.draft
          ? { ...drafts, [slide.id]: operation.draft }
          : withoutSceneDraft(drafts, slide.id);
        break;
      case 'updateSceneProperties':
        if (!slide.scene) return failure('NOT_FOUND', 'This slide has no custom scene.');
        slides[index] = {
          ...slide,
          scene: { ...slide.scene, properties: { ...slide.scene.properties, ...operation.patch } },
        };
        break;
      case 'updateSlide': {
        const updated = slideSchema.safeParse({ ...slide, ...operation.patch });
        if (!updated.success) return failure('INVALID_INPUT', 'The slide properties are invalid.');
        slides[index] = updated.data;
        break;
      }
      case 'updateMedia': {
        if (!slide.media) return failure('NOT_FOUND', 'This slide has no media to edit.');
        const { frame, ...properties } = operation.patch;
        const media = mediaSchema.safeParse({
          ...slide.media,
          ...properties,
          ...(frame ? { frame: { ...mediaFrame(slide.media), ...frame } } : {}),
        });
        if (!media.success) return failure('INVALID_INPUT', 'The media properties are invalid.');
        slides[index] = { ...slide, media: media.data };
        break;
      }
      case 'duplicateSlide':
        slides.splice(index + 1, 0, { ...slide, id: operation.newId });
        break;
      case 'deleteSlide':
        slides.splice(index, 1);
        drafts = withoutSceneDraft(drafts, slide.id);
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
    next = { ...content, slides, ...(drafts ? { drafts } : {}) };
  }
  if (
    !projectSchema.safeParse(next).success ||
    new Set(next.slides.map((slide) => slide.id)).size !== next.slides.length
  ) {
    return failure('INVALID_INPUT', 'A deck needs 1 to 200 slides with unique IDs.');
  }
  return { ok: true, value: next };
}
