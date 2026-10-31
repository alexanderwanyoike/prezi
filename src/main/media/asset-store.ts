import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
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

  path(id: string): string | undefined {
    return this.paths.get(id);
  }

  remember(path: string, assets: MediaAsset[]): void {
    assets.forEach((asset) => {
      this.paths.set(asset.id, join(`${path}.assets`, `${asset.id}.${asset.extension}`));
    });
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
      await mkdir(this.root, { recursive: true });
      const target = join(this.root, `${parsed.data.id}.${parsed.data.extension}`);
      await copyFile(path, target);
      this.paths.set(parsed.data.id, target);
      return { ok: true, value: parsed.data };
    } catch {
      return failure('IO_ERROR', 'Could not import the local media file. The slide is unchanged.');
    }
  }

  async save(path: string, assets: MediaAsset[]): Promise<Result<void>> {
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

  async dispose(): Promise<void> {
    await Promise.all(
      [this.root, ...this.archiveDirectories].map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
    this.archiveDirectories.clear();
  }
}
