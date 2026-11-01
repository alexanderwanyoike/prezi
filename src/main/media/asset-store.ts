import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import type { StoredAsset } from '../../shared/project-assets';
import type { FontCredit, ProjectFont } from '../../shared/fonts';
import { validateImage } from './validate-image';
import { importFontFile } from './import-font';
import { mediaSchema } from '../../shared/media';
import type { MediaAsset } from '../../shared/media';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export class AssetStore {
  private readonly root = join(tmpdir(), `prezi-imports-${crypto.randomUUID()}`);

  private readonly archiveDirectories = new Set<string>();

  adopt(directory: string, assets: { id: string; path: string }[]): void {
    this.archiveDirectories.add(directory);
    assets.forEach((asset) => {
      this.paths.set(asset.id, asset.path);
    });
  }

  private readonly paths = new Map<string, string>();

  register(id: string, path: string): void {
    this.paths.set(id, path);
  }

  path(id: string): string | undefined {
    return this.paths.get(id);
  }

  remember(path: string, assets: StoredAsset[]): void {
    assets.forEach((asset) => {
      this.paths.set(asset.id, join(`${path}.assets`, `${asset.id}.${asset.extension}`));
    });
  }

  async importFont(path: string, credit: FontCredit): Promise<Result<ProjectFont>> {
    const result = await importFontFile(path, this.root, credit);
    if (!result.ok) return result;
    this.paths.set(result.value.font.id, result.value.path);
    return { ok: true, value: result.value.font };
  }

  async import(path: string): Promise<Result<MediaAsset>> {
    const extension = extname(path).slice(1).toLowerCase();
    const parsed = mediaSchema.safeParse({
      id: crypto.randomUUID(),
      name: basename(path),
      kind: ['mp4', 'webm'].includes(extension) ? 'video' : 'image',
      extension,
    });
    if (!parsed.success)
      return failure('INVALID_INPUT', 'Choose PNG, JPEG, WebP, GIF, MP4 or WebM media.');
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size === 0)
        return failure('INVALID_INPUT', 'Choose a non-empty media file.');
      if (parsed.data.kind === 'image') {
        const checked = await validateImage(path, info.size);
        if (!checked.ok) return checked;
      }
      await mkdir(this.root, { recursive: true });
      const target = join(this.root, `${parsed.data.id}.${parsed.data.extension}`);
      await copyFile(path, target);
      this.paths.set(parsed.data.id, target);
      return { ok: true, value: parsed.data };
    } catch {
      return failure('IO_ERROR', 'Could not import the local media file. The slide is unchanged.');
    }
  }

  async save(path: string, assets: StoredAsset[]): Promise<Result<void>> {
    const unique = [...new Map(assets.map((asset) => [asset.id, asset])).values()];
    return unique.reduce<Promise<Result<void>>>(
      async (previous, asset) => {
        const result = await previous;
        if (!result.ok) return result;
        const source = this.paths.get(asset.id);
        if (!source) return failure('NOT_FOUND', `Missing media: ${asset.name}`);
        const destination = join(`${path}.assets`, `${asset.id}.${asset.extension}`);
        if (source === destination) {
          try {
            await stat(source);
            return { ok: true, value: undefined };
          } catch {
            return failure('NOT_FOUND', `Missing media: ${asset.name}`);
          }
        }
        const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
        try {
          await mkdir(`${path}.assets`, { recursive: true });
          await copyFile(source, temporary);
          await rename(temporary, destination);
          return { ok: true, value: undefined };
        } catch {
          return failure(
            'IO_ERROR',
            `Could not save media: ${asset.name}. The project file is unchanged.`,
          );
        } finally {
          await rm(temporary, { force: true }).catch(() => undefined);
        }
      },
      Promise.resolve({ ok: true, value: undefined }),
    );
  }

  async dispose(): Promise<Result<void>> {
    try {
      await Promise.all(
        [this.root, ...this.archiveDirectories].map((directory) =>
          rm(directory, { recursive: true, force: true }),
        ),
      );
      this.archiveDirectories.clear();
      this.paths.clear();
      return { ok: true, value: undefined };
    } catch {
      return failure('IO_ERROR', 'Could not remove all temporary project resources.');
    }
  }
}
