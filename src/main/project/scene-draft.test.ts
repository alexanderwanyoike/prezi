import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProjectOwner } from './project-owner';

it('keeps an unapplied source draft in the saved project without replacing its working slide', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-draft-'));
  const owner = new ProjectOwner();
  const reopened = new ProjectOwner();
  try {
    const initial = owner.snapshot();
    const slide = initial.project.slides[0];
    if (!slide) throw Error('No slide');
    const draft = {
      definitionId: crypto.randomUUID(),
      baseVersion: null,
      entry: 'Scene.tsx',
      files: { 'Scene.tsx': 'export default function Scene(){ return <div>Draft</div>; }' },
      metadata: '{"name":',
    };
    const edited = owner.edit({
      requestId: 'draft',
      expectedRevision: 0,
      label: 'Edit scene source',
      operations: [{ type: 'setSceneDraft', slideId: slide.id, draft }],
    });
    expect(edited.ok).toBe(true);
    expect(owner.snapshot().project.slides).toEqual(initial.project.slides);
    expect(owner.snapshot().dirty).toBe(true);
    const path = join(directory, 'draft.prezi');
    expect((await owner.save(path)).ok).toBe(true);
    expect((await reopened.open(path, 0)).ok).toBe(true);
    expect(reopened.snapshot().project.drafts?.[slide.id]).toEqual(draft);
    owner.undo(1);
    expect(owner.snapshot().project.drafts?.[slide.id]).toBeUndefined();
  } finally {
    await owner.dispose();
    await reopened.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('preserves human drafts during agent compilation and consumes a draft only when explicitly applied', () => {
  const owner = new ProjectOwner();
  const slide = owner.snapshot().project.slides[0];
  if (!slide) throw Error('No slide');
  const draft = {
    definitionId: crypto.randomUUID(),
    baseVersion: null,
    entry: 'Scene.tsx',
    files: { 'Scene.tsx': 'export default function Scene(){return <div/>;}' },
    metadata: '{}',
  };
  owner.edit({
    requestId: 'draft',
    expectedRevision: 0,
    label: 'Draft',
    operations: [{ type: 'setSceneDraft', slideId: slide.id, draft }],
  });
  const definition = {
    id: draft.definitionId,
    name: 'Scene',
    source: { entry: draft.entry, files: draft.files },
    fields: {},
    layers: [],
    code: 'working',
  };
  expect(
    owner.installScene({
      requestId: 'agent',
      expectedRevision: 1,
      label: 'Agent source',
      slideId: slide.id,
      definition,
      properties: {},
    }).ok,
  ).toBe(true);
  expect(owner.snapshot().project.drafts?.[slide.id]).toEqual(draft);
  const working = owner.snapshot();
  expect(
    owner.installScene({
      requestId: 'apply-draft',
      expectedRevision: 2,
      label: 'Apply draft',
      slideId: slide.id,
      definition: { ...definition, code: 'new working' },
      properties: {},
      consumeDraft: true,
    }).ok,
  ).toBe(true);
  expect(owner.snapshot().project.drafts?.[slide.id]).toBeUndefined();
  owner.undo(3);
  expect(owner.snapshot().project).toEqual(working.project);
});
