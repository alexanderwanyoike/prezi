import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ProjectOwner } from './project-owner';

it('imports a real font with its notice, selects it through shared history and reopens portable bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-font-'));
  const owner = new ProjectOwner();
  const reopened = new ProjectOwner();
  try {
    const fixture = resolve(
      'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
    );
    const license = await readFile('licenses/ibm-plex-mono.txt', 'utf8');
    const result = await owner.importFont(fixture, 0, 'font-import', {
      provenance: 'IBM Plex / locally supplied fixture',
      license,
    });
    expect(result.ok).toBe(true);
    expect(
      await owner.importFont(fixture, 0, 'font-import', {
        provenance: 'IBM Plex / locally supplied fixture',
        license,
      }),
    ).toEqual(result);
    const font = owner.snapshot().project.fonts?.[0];
    if (!font) throw Error('Missing imported font');
    expect(font).toMatchObject({
      extension: 'woff2',
      license,
      provenance: 'IBM Plex / locally supplied fixture',
    });
    expect(
      owner.edit({
        requestId: 'font-choice',
        expectedRevision: 1,
        label: 'Select imported font',
        operations: [{ type: 'setTheme', patch: { bodyFont: font.id } }],
      }).ok,
    ).toBe(true);
    const path = join(directory, 'fonts.prezi');
    expect((await owner.save(path)).ok).toBe(true);
    expect((await reopened.open(path, 0)).ok).toBe(true);
    expect(reopened.snapshot().project.fonts).toEqual(owner.snapshot().project.fonts);
    const recovered = reopened.mediaPath(font.id);
    if (!recovered) throw Error('Missing portable font');
    expect(await readFile(recovered)).toEqual(await readFile(fixture));
    expect(owner.undo(2).ok).toBe(true);
    expect(owner.snapshot().project.theme).toBeUndefined();
    expect(owner.undo(3).ok).toBe(true);
    expect(owner.snapshot().project.fonts).toBeUndefined();
  } finally {
    await owner.dispose();
    await reopened.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects unsupported font bytes, oversized fonts and missing selected font identities without changing content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-font-invalid-'));
  const owner = new ProjectOwner();
  try {
    const path = join(directory, 'invalid.woff2');
    await writeFile(path, 'This is not a font');
    const initial = owner.snapshot();
    expect((await owner.importFont(path, 0)).ok).toBe(false);
    expect(owner.snapshot()).toEqual(initial);
    await writeFile(path, Buffer.alloc(16 * 1024 * 1024 + 1));
    expect((await owner.importFont(path, 0)).ok).toBe(false);
    expect(owner.snapshot()).toEqual(initial);
    expect(
      owner.edit({
        requestId: 'missing-font',
        expectedRevision: 0,
        label: 'Missing font',
        operations: [{ type: 'setTheme', patch: { bodyFont: crypto.randomUUID() } }],
      }).ok,
    ).toBe(false);
    expect(owner.snapshot()).toEqual(initial);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
