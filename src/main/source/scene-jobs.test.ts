import { expect, it } from 'vitest';
import { setTimeout as pause } from 'node:timers/promises';
import { ProjectOwner } from '../project/project-owner';
import { SceneJobs } from './scene-jobs';
import type { Compilation } from '../../shared/custom-scene';

it('preserves the working scene after invalid source or revision conflicts and retries one accepted job', async () => {
  const owner = new ProjectOwner();
  const initial = owner.snapshot();
  const slide = initial.project.slides[0];
  if (!slide) throw Error('No slide');
  let compiled = 0;
  let complete: (value: Compilation) => void = () => {
    throw Error('No active compiler');
  };
  const jobs = new SceneJobs(
    owner,
    () => {
      compiled += 1;
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
    () => Promise.resolve({ ok: true, value: undefined }),
  );
  const request = {
    requestId: 'source-job',
    expectedRevision: 0,
    label: 'Create a scene',
    slideId: slide.id,
    candidate: {
      id: crypto.randomUUID(),
      name: 'Scene',
      source: {
        entry: 'Scene.tsx',
        files: { 'Scene.tsx': 'export default function Scene(){return <div/>;}' },
      },
      fields: {},
      layers: [],
    },
    properties: {},
  };
  const submitted = jobs.submit(request);
  expect(submitted.ok).toBe(true);
  if (!submitted.ok) throw Error('No job');
  expect(jobs.submit(request)).toEqual(submitted);
  expect(compiled).toBe(1);
  complete({
    ok: false,
    error: {
      code: 'INVALID_INPUT',
      message: 'Syntax error',
      diagnostics: [{ file: 'Scene.tsx', line: 2, column: 1, message: 'Unexpected token' }],
    },
  });
  await expect
    .poll(() => jobs.read(request.requestId))
    .toMatchObject({ ok: true, value: { state: 'failed' } });
  expect(owner.snapshot()).toEqual(initial);
  const next = { ...request, requestId: 'accepted-source' };
  jobs.submit(next);
  complete({ ok: true, value: { code: 'compiled' } });
  await expect
    .poll(() => jobs.read(next.requestId))
    .toMatchObject({ ok: true, value: { state: 'complete', revision: 1 } });
  expect(owner.snapshot().undoLabel).toBe('Create a scene');
  const accepted = owner.snapshot();
  expect(jobs.submit(next).ok).toBe(true);
  expect(compiled).toBe(2);
  const stale = { ...request, requestId: 'became-stale', expectedRevision: 1 };
  jobs.submit(stale);
  owner.edit({
    requestId: 'human',
    expectedRevision: 1,
    label: 'Human title',
    operations: [{ type: 'renameProject', name: 'Keep human work' }],
  });
  complete({ ok: true, value: { code: 'new code' } });
  await pause(0);
  expect(jobs.read(stale.requestId)).toMatchObject({
    ok: true,
    value: { state: 'failed', error: { code: 'CONFLICT' } },
  });
  expect(owner.snapshot().project.scenes).toEqual(accepted.project.scenes);
  expect(owner.snapshot().project.name).toBe('Keep human work');
});
