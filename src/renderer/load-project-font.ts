import type { ProjectFont } from '../shared/fonts';
import { mediaUrl } from '../shared/media';
import { failure } from '../shared/result';
import type { Result } from '../shared/result';

export async function loadProjectFont(font: ProjectFont): Promise<Result<FontFace>> {
  try {
    const face = new FontFace(`PreziFont_${font.id}`, `url("${mediaUrl(font.id)}")`);
    await face.load();
    return { ok: true, value: face };
  } catch {
    return failure(
      'IO_ERROR',
      `Could not load ${font.name}. Open Presentation theme to choose another font or import a replacement.`,
    );
  }
}
