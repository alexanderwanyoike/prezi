import { expect, it } from 'vitest';
import { ProjectOwner } from '../project/project-owner';
import { SceneJobs } from './scene-jobs';

it('refuses to apply a draft over an independently updated component version', () => {
  const owner = new ProjectOwner();
  const slide = owner.snapshot().project.slides[0];
  if (!slide) throw Error('No slide');
  const candidate = {
    id: crypto.randomUUID(),
    name: 'Versioned scene',
    source: {
      entry: 'Scene.tsx',
      files: { 'Scene.tsx': 'export default function Scene(){return <div/>;}' },
    },
    fields: {},
    layers: [],
  };
  expect(
    owner.installScene({
      requestId: 'original',
      expectedRevision: 0,
      label: 'Original',
      slideId: slide.id,
      definition: { ...candidate, code: 'first' },
      properties: {},
    }).ok,
  ).toBe(true);
  const version = owner.snapshot().project.scenes?.[candidate.id]?.version ?? null;
  expect(
    owner.installScene({
      requestId: 'agent-update',
      expectedRevision: 1,
      label: 'Agent source',
      slideId: slide.id,
      definition: { ...candidate, code: 'second' },
      properties: {},
    }).ok,
  ).toBe(true);
  expect(owner.snapshot().project.scenes?.[candidate.id]?.version).not.toBe(version);
  const jobs = new SceneJobs(
    owner,
    () => Promise.resolve({ ok: true, value: { code: 'old draft' } }),
    () => Promise.resolve({ ok: true, value: undefined }),
  );
  try {
    const result = jobs.submit({
      requestId: 'stale-draft',
      expectedRevision: 2,
      expectedDefinitionVersion: version,
      label: 'Apply old draft',
      slideId: slide.id,
      candidate,
      properties: {},
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  } finally {
    jobs.dispose();
  }
});
