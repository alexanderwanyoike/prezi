import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { ProjectOwner } from './project-owner';

test('imports local media into an undoable slide edit and saves a copy independent of its source', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-media-test-'));
  const owner = new ProjectOwner();
  try {
    const source = join(directory, 'sample.png');
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );
    await writeFile(source, bytes);
    const initial = owner.snapshot();
    const slideId = initial.project.slides[0]?.id;
    if (!slideId) throw new Error('Missing example slide');
    const imported = await owner.importMedia(source, slideId, initial.revision);
    expect(imported.ok).toBe(true);
    const media = owner.snapshot().project.slides[0]?.media;
    expect(media).toMatchObject({ kind: 'image', name: 'sample.png', extension: 'png' });
    if (!media) throw new Error('Missing imported media');
    await unlink(source);
    const savedPath = join(directory, 'deck.prezi.json');
    expect((await owner.save(savedPath)).ok).toBe(true);
    expect(await readFile(join(`${savedPath}.assets`, `${media.id}.png`))).toEqual(bytes);
    expect(owner.undo(owner.snapshot().revision).ok).toBe(true);
    expect(owner.snapshot().project.slides[0]?.media).toBeUndefined();
    expect(owner.redo(owner.snapshot().revision).ok).toBe(true);
    const reopened = new ProjectOwner();
    expect((await reopened.open(savedPath, 0)).ok).toBe(true);
    const secondPath = join(directory, 'copy.prezi.json');
    expect((await reopened.save(secondPath)).ok).toBe(true);
    expect(await readFile(join(`${secondPath}.assets`, `${media.id}.png`))).toEqual(bytes);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('failed and stale media imports preserve the current deck and revision', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-media-failure-'));
  const owner = new ProjectOwner();
  try {
    const initial = owner.snapshot();
    const slideId = initial.project.slides[0]?.id;
    if (!slideId) throw new Error('Missing example slide');
    const unsupported = join(directory, 'recording.avi');
    await writeFile(unsupported, 'unsupported');
    expect(await owner.importMedia(unsupported, slideId, initial.revision)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    expect(
      await owner.importMedia(join(directory, 'missing.png'), slideId, initial.revision),
    ).toMatchObject({ ok: false, error: { code: 'IO_ERROR' } });
    expect(await owner.importMedia(unsupported, slideId, initial.revision + 1)).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });
    expect(owner.snapshot()).toEqual(initial);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('updates media properties atomically without replacing asset identity', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-media-properties-'));
  const owner = new ProjectOwner();
  try {
    const path = join(directory, 'clip.webm');
    await writeFile(path, 'small media fixture');
    const slideId = owner.snapshot().project.slides[0]?.id;
    if (!slideId) throw new Error('Missing opening slide');
    expect((await owner.importMedia(path, slideId, 0)).ok).toBe(true);
    const original = owner.snapshot();
    const edited = owner.edit({
      requestId: 'media-properties',
      expectedRevision: original.revision,
      label: 'Configure media',
      operations: [
        { type: 'updateMedia', slideId, patch: { autoplay: false } },
        {
          type: 'updateMedia',
          slideId,
          patch: {
            loop: true,
            muted: false,
            volume: 0.35,
            fit: 'cover',
            frame: { x: 900, y: 200, width: 800, height: 600 },
          },
        },
      ],
    });
    expect(edited.ok).toBe(true);
    expect(owner.snapshot().project.slides[0]?.media).toMatchObject({
      ...original.project.slides[0]?.media,
      autoplay: false,
      loop: true,
      muted: false,
      volume: 0.35,
      fit: 'cover',
    });
    expect(owner.undo(owner.snapshot().revision).ok).toBe(true);
    expect(owner.snapshot().project).toEqual(original.project);
    expect(owner.redo(owner.snapshot().revision).ok).toBe(true);
    const before = owner.snapshot();
    expect(
      owner.edit({
        requestId: 'invalid-frame',
        expectedRevision: before.revision,
        label: 'Move outside stage',
        operations: [
          {
            type: 'updateMedia',
            slideId,
            patch: { frame: { x: 1800, y: 200, width: 800, height: 600 } },
          },
        ],
      }),
    ).toMatchObject({ ok: false });
    expect(owner.snapshot()).toEqual(before);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('retries the same media registration once even after its source is removed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-media-retry-'));
  const source = join(directory, 'image.png');
  await writeFile(source, Buffer.from('image fixture'));
  const owner = new ProjectOwner();
  try {
    const slideId = owner.snapshot().project.slides[0]?.id;
    if (!slideId) throw new Error('Missing slide');
    const [first, concurrent] = await Promise.all([
      owner.importMedia(source, slideId, 0, 'register'),
      owner.importMedia(source, slideId, 0, 'register'),
    ]);
    expect(first.ok).toBe(true);
    expect(concurrent).toEqual(first);
    await rm(source);
    expect(await owner.importMedia(source, slideId, 0, 'register')).toEqual(first);
    expect(owner.snapshot().revision).toBe(1);
    expect(owner.snapshot().undoLabel).toBe('Agent: Import media');
    expect(await owner.importMedia(source, slideId, 1, 'register')).toMatchObject({
      ok: false,
      error: { code: 'REQUEST_REUSED' },
    });
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
