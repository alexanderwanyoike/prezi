import type { Project } from './project';

export function slideElementIds(project: Project, slideId: string): string[] {
  const slide = project.slides.find((item) => item.id === slideId);
  if (!slide) return [];
  const layers = slide.scene
    ? (project.scenes?.[slide.scene.definitionId]?.layers.map((layer) => layer.id) ?? [])
    : ['heading', 'body', ...(slide.layout === 'code' ? ['code'] : [])];
  return [...new Set([...layers, ...(slide.media ? ['media'] : [])])].map(
    (id) => `${slideId}:${id}`,
  );
}
