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

it('keeps intervening agent batches and group retries independent', () => {
  const owner = new ProjectOwner();
  const group = crypto.randomUUID();
  const initial = owner.snapshot();
  const slide = initial.project.slides[0];
  if (!slide) throw Error('No slide');
  const first = {
    requestId: 'first-group',
    expectedRevision: 0,
    label: 'Human edit',
    operations: [{ type: 'updateSlide', slideId: slide.id, patch: { title: 'First' } }],
  };
  const accepted = owner.edit(first, group);
  expect(accepted.ok).toBe(true);
  expect(
    owner.edit({
      requestId: 'intervening-agent',
      expectedRevision: 1,
      label: 'Agent batch',
      operations: [{ type: 'updateSlide', slideId: slide.id, patch: { title: 'Agent' } }],
    }).ok,
  ).toBe(true);
  expect(
    owner.edit(
      {
        requestId: 'second-group',
        expectedRevision: 2,
        label: 'Human edit',
        operations: [{ type: 'updateSlide', slideId: slide.id, patch: { title: 'Second' } }],
      },
      group,
    ).ok,
  ).toBe(true);
  expect(owner.edit(first, group)).toEqual(accepted);
  expect(owner.snapshot().revision).toBe(3);
  owner.undo(3);
  expect(owner.snapshot().project.slides[0]?.title).toBe('Agent');
  owner.undo(4);
  expect(owner.snapshot().project.slides[0]?.title).toBe('First');
  owner.undo(5);
  expect(owner.snapshot().project).toEqual(initial.project);
});

it('starts a fresh group after Undo even if the editor reuses its identity', () => {
  const owner = new ProjectOwner();
  const group = crypto.randomUUID();
  const initial = owner.snapshot();
  owner.edit(
    {
      requestId: 'name-one',
      expectedRevision: 0,
      label: 'Rename',
      operations: [{ type: 'renameProject', name: 'One' }],
    },
    group,
  );
  owner.undo(1);
  owner.edit(
    {
      requestId: 'name-two',
      expectedRevision: 2,
      label: 'Rename',
      operations: [{ type: 'renameProject', name: 'Two' }],
    },
    group,
  );
  owner.undo(3);
  expect(owner.snapshot().project).toEqual(initial.project);
});
