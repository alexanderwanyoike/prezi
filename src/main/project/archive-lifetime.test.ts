import { expect, it } from 'vitest';
import { mkdtemp, writeFile, access, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectOwner } from './project-owner';

it('retains current extraction after failed opening and releases it after another project opens', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-archive-lifetime-'));
  const writer = new ProjectOwner();
  const reader = new ProjectOwner();
  try {
    const image = join(directory, 'image.png');
    await writeFile(
      image,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    const slideId = writer.snapshot().project.slides[0]?.id;
    if (!slideId) throw Error('No slide');
    expect((await writer.importMedia(image, slideId, 0)).ok).toBe(true);
    const first = join(directory, 'first.prezi');
    const second = join(directory, 'second.prezi');
    expect((await writer.save(first)).ok).toBe(true);
    expect((await writer.save(second)).ok).toBe(true);
    expect((await reader.open(first, 0)).ok).toBe(true);
    const firstState = reader.snapshot();
    const id = firstState.project.slides[0]?.media?.id;
    const extracted = id ? reader.mediaPath(id) : null;
    if (!id || !extracted) throw Error('No extracted asset');
    expect(await readFile(extracted)).toEqual(await readFile(image));
    const corrupt = join(directory, 'invalid.prezi');
    await writeFile(corrupt, 'invalid archive');
    expect((await reader.open(corrupt, firstState.revision)).ok).toBe(false);
    expect(reader.snapshot()).toEqual(firstState);
    expect(
      await access(extracted).then(
        () => true,
        () => false,
      ),
    ).toBe(true);
    expect((await reader.open(second, firstState.revision)).ok).toBe(true);
    const current = reader.mediaPath(id);
    if (!current) throw Error('No current asset');
    expect(current).not.toBe(extracted);
    expect(await readFile(current)).toEqual(await readFile(image));
    expect(
      await access(dirname(extracted)).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
  } finally {
    await writer.dispose();
    await reader.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('releases an extracted project when a new presentation replaces its history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-new-lifetime-'));
  const owner = new ProjectOwner();
  try {
    const image = join(directory, 'image.png');
    await writeFile(
      image,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    const slide = owner.snapshot().project.slides[0];
    if (!slide) throw Error('No slide');
    expect((await owner.importMedia(image, slide.id, 0)).ok).toBe(true);
    const path = join(directory, 'deck.prezi');
    expect((await owner.save(path)).ok).toBe(true);
    expect((await owner.open(path, 1)).ok).toBe(true);
    const id = owner.snapshot().project.slides[0]?.media?.id;
    const extracted = id ? owner.mediaPath(id) : null;
    if (!extracted) throw Error('No extraction');
    expect((await owner.reset(2)).ok).toBe(true);
    expect(
      await access(dirname(extracted)).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
