import type { Project } from '../project';

export interface PresentationPosition {
  slideId: string;
  reveal: number;
}
export function startPosition(project: Project): PresentationPosition {
  return { slideId: project.slides[0]?.id ?? '', reveal: 0 };
}
export function navigate(
  project: Project,
  position: PresentationPosition,
  direction: 'advance' | 'back',
): PresentationPosition {
  const index = Math.max(
    0,
    project.slides.findIndex((slide) => slide.id === position.slideId),
  );
  const slide = project.slides[index];
  if (!slide) return position;
  const reveal = Math.min(Math.max(0, position.reveal), slide.reveals.length);
  if (direction === 'advance') {
    if (reveal < slide.reveals.length) return { slideId: slide.id, reveal: reveal + 1 };
    const next = project.slides[index + 1];
    return next ? { slideId: next.id, reveal: 0 } : position;
  }
  if (reveal > 0) return { slideId: slide.id, reveal: reveal - 1 };
  const previous = project.slides[index - 1];
  return previous ? { slideId: previous.id, reveal: previous.reveals.length } : position;
}
