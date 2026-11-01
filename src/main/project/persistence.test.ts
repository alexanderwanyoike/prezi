import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

it('saves an edited deck and reopens exactly the same content with a clean history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-save-'));
  try {
    const path = join(directory, 'explanation.prezi.json');
    const owner = new ProjectOwner();
    const slide = owner.snapshot().project.slides[0];
    if (!slide) throw new Error('Expected an opening slide');
    owner.edit({
      requestId: 'save-edit',
      expectedRevision: 0,
      label: 'Text',
      operations: [
        {
          type: 'updateSlide',
          slideId: slide.id,
          patch: { title: 'Saved explanation', reveals: ['First point', 'Second point'] },
        },
      ],
    });
    const { project } = owner.snapshot();
    expect((await owner.save(path)).ok).toBe(true);
    expect(owner.snapshot().dirty).toBe(false);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(project);
    const reopened = new ProjectOwner();
    expect((await reopened.open(path, 0)).ok).toBe(true);
    expect(reopened.snapshot()).toMatchObject({
      project,
      dirty: false,
      canUndo: false,
      canRedo: false,
      filePath: path,
    });
    owner.undo(owner.snapshot().revision);
    expect(owner.snapshot().dirty).toBe(true);
    owner.redo(owner.snapshot().revision);
    expect(owner.snapshot().dirty).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('creates a fresh unsaved deck without carrying history or permitting a stale reset', async () => {
  const owner = new ProjectOwner();
  const original = owner.snapshot();
  expect((await owner.reset(0)).ok).toBe(true);
  const fresh = owner.snapshot();
  expect(fresh.project.id).not.toBe(original.project.id);
  expect(fresh.project.name).toBe('Untitled presentation');
  expect(fresh.project.slides).toHaveLength(1);
  expect(fresh).toMatchObject({ filePath: null, canUndo: false, canRedo: false });
  expect(await owner.reset(0)).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  expect(owner.snapshot()).toEqual(fresh);
});
