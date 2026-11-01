import { expect, it } from 'vitest';
import { exampleOwner } from '../../../tests/fixtures/example-owner';

it('merges coordinate edits independently instead of replacing other accepted frame properties', async () => {
  const owner = await exampleOwner();
  const slide = owner.snapshot().project.slides[2];
  if (!slide) throw Error('No media slide');
  expect(
    owner.edit({
      requestId: 'coordinates',
      expectedRevision: 1,
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
      expectedRevision: 2,
      label: 'Invalid move',
      operations: [{ type: 'updateMedia', slideId: slide.id, patch: { frame: { width: 1900 } } }],
    }).ok,
  ).toBe(false);
  expect(owner.snapshot()).toEqual(accepted);
  expect(owner.undo(2).ok).toBe(true);
  expect(owner.snapshot().project.slides[2]?.media?.frame).toBeUndefined();
});
