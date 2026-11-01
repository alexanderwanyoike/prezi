import type { Project } from './project';

export interface StoredAsset {
  id: string;
  name: string;
  extension: string;
}
export function projectAssets(project: Project): StoredAsset[] {
  return [
    ...new Map(
      [
        ...project.slides.flatMap((slide) => (slide.media ? [slide.media] : [])),
        ...(project.fonts ?? []),
      ].map((asset) => [asset.id, asset]),
    ).values(),
  ];
}
