import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';
import { writeProject } from './project-files';
import { createProject } from '../../shared/project';
import { readArchive } from '../archive/read-archive';

it('retains archived reference source outside edit snapshots and preserves it on save', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-catalog-'));
  const owner = new ProjectOwner();
  let extracted: string | undefined;
  try {
    const source = 'export default function OriginalLayout() {return null;}';
    const sources = { 'renderer/presentation/SlideScene.tsx': source };
    const project = { ...createProject(), sources };
    const path = join(directory, 'original.prezi.json');
    expect((await writeProject(path, project)).ok).toBe(true);
    expect((await owner.open(path, 0)).ok).toBe(true);
    expect(owner.snapshot().project.sources).toBeUndefined();
    const catalog = owner.sourceCatalog();
    expect(catalog.files).toEqual(sources);
    const slide = owner.snapshot().project.slides[0];
    if (!slide) throw Error('No slide');
    for (let index = 0; index < 50; index += 1) {
      const result = owner.edit({
        requestId: `catalog-edit-${index.toString()}`,
        expectedRevision: owner.snapshot().revision,
        label: 'Change title',
        operations: [
          { type: 'updateSlide', slideId: slide.id, patch: { title: index.toString() } },
        ],
      });
      expect(result).toMatchObject({ ok: true });
      if (!result.ok) throw Error(result.error.message);
      expect(JSON.stringify(result.value)).not.toContain('OriginalLayout');
      expect(result.value.sourceCatalogId).toBe(catalog.id);
    }
    const saved = join(directory, 'saved.prezi');
    expect((await owner.save(saved)).ok).toBe(true);
    expect(owner.snapshot().dirty).toBe(false);
    const archive = await readArchive(saved);
    if (!archive.ok) throw Error(archive.error.message);
    extracted = archive.value.directory;
    expect(archive.value.project.sources).toEqual(sources);
    expect(owner.undo(owner.snapshot().revision).ok).toBe(true);
    expect(owner.sourceCatalog()).toEqual(catalog);
    expect(owner.snapshot().dirty).toBe(true);
    expect(owner.redo(owner.snapshot().revision).ok).toBe(true);
    expect(owner.snapshot().dirty).toBe(false);
    catalog.files['renderer/presentation/SlideScene.tsx'] = 'Changed outside owner';
    expect(owner.sourceCatalog().files).toEqual(sources);
    expect((await owner.reset(owner.snapshot().revision)).ok).toBe(true);
    expect(owner.sourceCatalog().id).not.toBe(catalog.id);
    expect(owner.sourceCatalog().files).not.toEqual(sources);
  } finally {
    await owner.dispose();
    if (extracted) await rm(extracted, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
