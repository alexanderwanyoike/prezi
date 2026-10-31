import { expect, it } from 'vitest';
import { resolve } from 'node:path';
import { ProjectOwner } from './project-owner';

it('merges coordinate edits independently instead of replacing other accepted frame properties', () => {
  const owner = new ProjectOwner(resolve('tests/fixtures/held-video.webm'));
  const slide = owner.snapshot().project.slides[2];
  if (!slide) throw Error('No media slide');
  expect(
    owner.edit({
      requestId: 'coordinates',
      expectedRevision: 0,
      label: 'Independent coordinates',
      operations: [
        { type: 'updateMedia', slideId: slide.id, patch: { frame: { x: 900 } } },
        { type: 'updateMedia', slideId: slide.id, patch: { frame: { y: 300 } } },
      ],
    }).ok,
  ).toBe(true);
  expect(owner.snapshot().project.slides[2]?.media?.frame).toEqual({
    x: 900,
    y: 300,
    width: 792,
    height: 640,
  });
  const accepted = owner.snapshot();
  expect(
    owner.edit({
      requestId: 'out-of-bounds',
      expectedRevision: 1,
      label: 'Invalid move',
      operations: [{ type: 'updateMedia', slideId: slide.id, patch: { frame: { width: 1900 } } }],
    }).ok,
  ).toBe(false);
  expect(owner.snapshot()).toEqual(accepted);
  expect(owner.undo(1).ok).toBe(true);
  expect(owner.snapshot().project.slides[2]?.media?.frame).toBeUndefined();
});
