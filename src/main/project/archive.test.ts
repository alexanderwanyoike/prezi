import { openAsBlob } from 'node:fs';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { expect, test } from 'vitest';
import { ProjectOwner } from './project-owner';

test('moves a single .prezi file containing the deck, scene source, fonts and media', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-archive-test-'));
  const owner = new ProjectOwner();
  const reopened = new ProjectOwner();
  try {
    const image = join(directory, 'sample.png');
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );
    await writeFile(image, bytes);
    const slideId = owner.snapshot().project.slides[0]?.id;
    if (!slideId) throw new Error('Missing opening slide');
    expect((await owner.importMedia(image, slideId, 0)).ok).toBe(true);
    const path = join(directory, 'deck.prezi');
    expect((await owner.save(path)).ok).toBe(true);
    expect((await readFile(path)).subarray(0, 2).toString()).toBe('PK');
    const zip = new ZipReader(new BlobReader(await openAsBlob(path)), { useWebWorkers: false });
    const entries = await zip.getEntries();
    expect(entries.map((entry) => entry.filename)).toEqual(
      expect.arrayContaining([
        'project.json',
        'manifest.json',
        'source/renderer/presentation/SlideScene.tsx',
        'source/renderer/styles/tokens.css',
        'fonts/manrope/index.css',
        'fonts/manrope/LICENSE',
        'fonts/ibm-plex-mono/index.css',
        'fonts/ibm-plex-mono/LICENSE',
      ]),
    );
    const metadata = entries.find((entry) => entry.filename === 'manifest.json');
    if (!metadata || metadata.directory) throw new Error('Missing archive manifest');
    const manifest: unknown = JSON.parse(await metadata.getData(new TextWriter()));
    expect(manifest).toMatchObject({ dependencies: { remotion: '4.0.539' } });
    const scene = entries.find(
      (entry) => entry.filename === 'source/renderer/presentation/SlideScene.tsx',
    );
    if (!scene || scene.directory) throw new Error('Missing scene source');
    expect(await scene.getData(new TextWriter())).toContain('useCurrentFrame');
    await zip.close();
    const moved = join(directory, 'portable.prezi');
    await rename(path, moved);
    await rm(`${path}.assets`, { recursive: true, force: true });
    await rm(image);
    await owner.dispose();
    expect((await reopened.open(moved, 0)).ok).toBe(true);
    const asset = reopened.snapshot().project.slides[0]?.media;
    if (!asset) throw new Error('Missing archived media');
    const restoredPath = reopened.mediaPath(asset.id);
    if (!restoredPath) throw new Error('Missing extracted media');
    expect(await readFile(restoredPath)).toEqual(bytes);
    expect((await reopened.save(join(directory, 'another.prezi'))).ok).toBe(true);
  } finally {
    await owner.dispose();
    await reopened.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
