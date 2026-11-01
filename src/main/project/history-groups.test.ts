import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

it('undoes a typing group once while retaining the preceding agent batch', () => {
  const owner = new ProjectOwner();
  const initial = owner.snapshot();
  const slide = initial.project.slides[0];
  if (!slide) throw Error('No slide');
  expect(
    owner.edit({
      requestId: 'agent',
      expectedRevision: 0,
      label: 'Agent edit',
      operations: [{ type: 'renameProject', name: 'Agent deck' }],
    }).ok,
  ).toBe(true);
  const group = crypto.randomUUID();
  Array.from({ length: 60 }, (_, index) => index).forEach((index) => {
    expect(
      owner.edit(
        {
          requestId: `typing-${index.toString()}`,
          expectedRevision: index + 1,
          label: 'Edit heading',
          operations: [
            { type: 'updateSlide', slideId: slide.id, patch: { title: 'x'.repeat(index + 1) } },
          ],
        },
        group,
      ).ok,
    ).toBe(true);
  });
  expect(owner.undo(61).ok).toBe(true);
  expect(owner.snapshot().project.slides[0]?.title).toBe(slide.title);
  expect(owner.snapshot().undoLabel).toBe('Agent edit');
  expect(owner.undo(62).ok).toBe(true);
  expect(owner.snapshot().project.name).toBe(initial.project.name);
});
