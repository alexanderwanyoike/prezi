import './zip-config';
import { openAsBlob } from 'node:fs';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ZipReader } from '@zip.js/zip.js';
import { z } from 'zod';
import { fontHeader } from '../media/font-header';
import { projectAssets } from '../../shared/project-assets';
import { BoundedBlobReader } from './bounded-blob-reader';
import { readTextEntry } from './read-text-entry';
import { projectSchema } from '../../shared/project';
import type { Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export interface OpenedArchive {
  project: Project;
  directory: string;
  assets: { id: string; path: string }[];
}
export async function readArchive(path: string): Promise<Result<OpenedArchive>> {
  let directory: string | null = null;
  try {
    const reader = new ZipReader(new BoundedBlobReader(await openAsBlob(path)), {
      useWebWorkers: false,
      strictness: 'strict',
    });
    try {
      const entries = await reader.getEntries({
        onprogress: (_index, total) => {
          if (total > 1000) throw new Error('A project archive may contain at most 1000 entries.');
        },
      });
      const files = entries.filter((entry) => !entry.directory);
      if (new Set(files.map((entry) => entry.filename)).size !== files.length)
        throw new Error('Archive filenames must be unique.');
      const manifest = files.find((entry) => entry.filename === 'manifest.json');
      const content = files.find((entry) => entry.filename === 'project.json');
      if (!manifest || !content) throw new Error('Missing project archive manifest or content.');
      const rawManifest: unknown = JSON.parse(await readTextEntry(manifest, 4096));
      z.object({
        format: z.literal('prezi'),
        version: z.literal(1),
        sceneVersion: z.literal(1),
      }).parse(rawManifest);
      const rawProject: unknown = JSON.parse(await readTextEntry(content, 8 * 1024 * 1024));
      const project = projectSchema.parse(rawProject);
      if (new Set(project.slides.map((slide) => slide.id)).size !== project.slides.length)
        throw new Error('Slide IDs must be unique.');
      const sourceEntries = files.filter((entry) => entry.filename.startsWith('source/'));
      const sources = await sourceEntries.reduce<Promise<Record<string, string>>>(
        (previous, entry) =>
          previous.then(async (current) => {
            if (Object.keys(current).length >= 128) throw new Error('Too many source files.');
            return { ...current, [entry.filename.slice(7)]: await readTextEntry(entry, 250000) };
          }),
        Promise.resolve({}),
      );
      const withSources = projectSchema.parse({ ...project, sources });
      directory = await mkdtemp(join(tmpdir(), 'prezi-project-'));
      const target = directory;
      const unique = new Map(projectAssets(project).map((asset) => [asset.id, asset]));
      const assets = await [...unique.values()].reduce<Promise<OpenedArchive['assets']>>(
        (previous, asset) =>
          previous.then(async (current) => {
            const name = `${asset.id}.${asset.extension}`;
            const entry = files.find((file) => file.filename === `assets/${name}`);
            if (!entry) return [...current, { id: asset.id, path: join(target, name) }];
            if (
              entry.uncompressedSize >
              (['ttf', 'otf', 'woff', 'woff2'].includes(asset.extension)
                ? 16 * 1024 * 1024
                : 8 * 1024 * 1024 * 1024)
            )
              throw new Error(`Missing or oversized media: ${asset.name}`);
            const destination = join(target, name);
            const output = await open(destination, 'wx', 0o600);
            let written = 0;
            try {
              await entry.getData(
                new WritableStream<Uint8Array>({
                  async write(chunk) {
                    written += chunk.byteLength;
                    if (written > entry.uncompressedSize)
                      throw new Error('Media exceeds its declared size.');
                    await output.writeFile(chunk);
                  },
                }),
                { checkSignature: true },
              );
            } finally {
              await output.close();
            }
            if (['ttf', 'otf', 'woff', 'woff2'].includes(asset.extension)) {
              const input = await open(destination, 'r');
              try {
                const header = Buffer.alloc(48);
                const { bytesRead } = await input.read(header, 0, 48, 0);
                const checked = fontHeader(header.subarray(0, bytesRead), written);
                if (!checked.ok) throw new Error(checked.error.message);
                if (checked.value !== asset.extension)
                  throw new Error('The archived font format does not match its registration.');
              } finally {
                await input.close();
              }
            }
            return [...current, { id: asset.id, path: destination }];
          }),
        Promise.resolve([]),
      );
      return { ok: true, value: { project: withSources, directory, assets } };
    } finally {
      await reader.close();
    }
  } catch (error) {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    return failure(
      'INVALID_INPUT',
      `Could not open the project archive: ${error instanceof Error ? error.message : 'unknown archive error'}`,
    );
  }
}
