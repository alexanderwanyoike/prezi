import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { ProjectOwner } from './project-owner';

it('opens a portable deck with absent media and repairs it without losing placement, playback or credits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-repair-'));
  const owner = new ProjectOwner();
  const reopened = new ProjectOwner();
  try {
    const fixture = resolve('tests/fixtures/held-video.webm');
    const sample = new ProjectOwner(fixture).snapshot().project;
    const slide = sample.slides[2];
    if (!slide?.media) throw Error('Missing example media');
    slide.media = {
      ...slide.media,
      frame: { x: 960, y: 240, width: 800, height: 450 },
      fit: 'cover',
      volume: 0.3,
      loop: true,
      muted: false,
      provenance: 'Generated test image and tone',
      license: 'Local verification fixture',
    };
    const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
    await writer.add(
      'manifest.json',
      new TextReader(JSON.stringify({ format: 'prezi', version: 1, sceneVersion: 1 })),
    );
    await writer.add('project.json', new TextReader(JSON.stringify(sample)));
    const archive = await writer.close();
    const path = join(directory, 'missing.prezi');
    await writeFile(path, new Uint8Array(await archive.arrayBuffer()));
    const original = await readFile(path);
    expect((await owner.open(path, 0)).ok).toBe(true);
    const missing = owner.snapshot();
    expect((await owner.save(path)).ok).toBe(false);
    expect(await readFile(path)).toEqual(original);
    const image = join(directory, 'wrong-kind.png');
    await writeFile(
      image,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    expect(
      (await owner.importMedia(image, slide.id, missing.revision, 'wrong-kind', {}, true)).ok,
    ).toBe(false);
    expect(owner.snapshot()).toEqual(missing);
    const repaired = await owner.importMedia(
      fixture,
      slide.id,
      missing.revision,
      'repair-media',
      {},
      true,
    );
    expect(repaired.ok).toBe(true);
    expect(
      await owner.importMedia(fixture, slide.id, missing.revision, 'repair-media', {}, true),
    ).toEqual(repaired);
    const media = owner.snapshot().project.slides[2]?.media;
    expect(media).toMatchObject({
      frame: slide.media.frame,
      fit: 'cover',
      volume: 0.3,
      loop: true,
      muted: false,
      provenance: slide.media.provenance,
      license: slide.media.license,
    });
    expect(media?.id).not.toBe(slide.media.id);
    expect(owner.undo(2).ok).toBe(true);
    expect(owner.snapshot().project).toEqual(missing.project);
    expect(owner.redo(3).ok).toBe(true);
    const saved = join(directory, 'repaired.prezi');
    expect((await owner.save(saved)).ok).toBe(true);
    expect((await reopened.open(saved, 0)).ok).toBe(true);
    expect(reopened.snapshot().project.slides[2]?.media).toEqual(media);
  } finally {
    await owner.dispose();
    await reopened.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('replaces a missing selected font while retaining its notice and allowing undo to its original identity', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-font-repair-'));
  const owner = new ProjectOwner();
  try {
    const fixture = resolve(
      'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
    );
    expect(
      (
        await owner.importFont(fixture, 0, 'original-font', {
          provenance: 'Supplied attribution',
          license: 'Retained notice',
        })
      ).ok,
    ).toBe(true);
    const old = owner.snapshot().project.fonts?.[0];
    if (!old) throw Error('Missing font');
    expect(
      owner.edit({
        requestId: 'select-font',
        expectedRevision: 1,
        label: 'Select font',
        operations: [{ type: 'setTheme', patch: { bodyFont: old.id, monoFont: old.id } }],
      }).ok,
    ).toBe(true);
    const path = owner.mediaPath(old.id);
    if (!path) throw Error('Missing font path');
    await rm(path);
    const before = owner.snapshot();
    expect((await owner.importFont(fixture, 2, 'repair-font', {}, old.id)).ok).toBe(true);
    const after = owner.snapshot();
    expect(after.project.fonts).toHaveLength(1);
    const next = after.project.fonts?.[0];
    if (!next) throw Error('No replacement font');
    expect(next.id).not.toBe(old.id);
    expect(next).toMatchObject({ provenance: old.provenance, license: old.license });
    expect(after.project.theme).toMatchObject({ bodyFont: next.id, monoFont: next.id });
    expect((await owner.save(join(directory, 'font-repaired.prezi'))).ok).toBe(true);
    expect(owner.undo(3).ok).toBe(true);
    expect(owner.snapshot().project).toEqual(before.project);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
