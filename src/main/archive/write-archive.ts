import './zip-config';
import { createWriteStream, openAsBlob } from 'node:fs';
import { open, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Writable } from 'node:stream';
import { BlobReader, TextReader, ZipWriter } from '@zip.js/zip.js';
import runtime from '../../../package.json';
import { archiveResources } from './archive-resources';
import { builtInSceneSources } from '../../shared/scene-sources';
import type { Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function writeArchive(
  path: string,
  project: Project,
  mediaPath: (id: string) => string | undefined,
): Promise<Result<void>> {
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  const output = createWriteStream(temporary, { flags: 'wx', mode: 0o600 });
  const writer = new ZipWriter(Writable.toWeb(output), {
    useWebWorkers: false,
    level: 0,
  });
  try {
    await writer.add(
      'manifest.json',
      new TextReader(
        JSON.stringify({
          format: 'prezi',
          version: 1,
          sceneVersion: 1,
          dependencies: runtime.dependencies,
        }),
      ),
    );
    await writer.add('project.json', new TextReader(JSON.stringify(project)));
    const sources = Object.entries(project.sources ?? builtInSceneSources);
    await sources.reduce<Promise<void>>(
      (previous, [name, source]) =>
        previous.then(async () => {
          await writer.add(`source/${name}`, new TextReader(source));
        }),
      Promise.resolve(),
    );
    const unique = new Map(
      project.slides.flatMap((slide) =>
        slide.media ? [[slide.media.id, slide.media] as const] : [],
      ),
    );
    await [...unique.values()].reduce<Promise<void>>(
      (previous, asset) =>
        previous.then(async () => {
          const source = mediaPath(asset.id);
          if (!source) throw new Error(`Missing media: ${asset.name}`);
          await writer.add(
            `assets/${asset.id}.${asset.extension}`,
            new BlobReader(await openAsBlob(source)),
          );
        }),
      Promise.resolve(),
    );
    const resources = await archiveResources();
    await resources.reduce<Promise<void>>(
      (previous, resource) =>
        previous.then(async () => {
          await writer.add(resource.name, new BlobReader(await openAsBlob(resource.path)));
        }),
      Promise.resolve(),
    );
    await writer.close();
    const file = await open(temporary, 'r+');
    try {
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
    if (process.platform === 'linux') {
      const directory = await open(dirname(path), 'r');
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    }
    return { ok: true, value: undefined };
  } catch (error) {
    output.destroy();
    return failure(
      'IO_ERROR',
      `Could not save the project archive: ${error instanceof Error ? error.message : 'unknown archive error'}`,
    );
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
