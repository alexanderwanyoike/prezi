import { describe, expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

describe('project editing', () => {
  it('publishes a text edit through the same owner observed by every client', () => {
    const owner = new ProjectOwner();
    const before = owner.snapshot();
    const slide = before.project.slides[0];
    if (!slide) throw new Error('Expected an initial slide');
    const observed: string[] = [];
    owner.subscribe((snapshot) => {
      observed.push(snapshot.project.slides[0]?.title ?? '');
    });
    const edited = owner.edit({
      requestId: 'first-edit',
      expectedRevision: before.revision,
      label: 'Rename opening slide',
      operations: [
        { type: 'updateSlide', slideId: slide.id, patch: { title: 'A quieter opening' } },
      ],
    });
    expect(edited.ok).toBe(true);
    expect(owner.snapshot().project.slides[0]?.title).toBe('A quieter opening');
    expect(owner.snapshot().revision).toBe(before.revision + 1);
    expect(observed).toEqual(['A quieter opening']);
    expect(owner.snapshot().dirty).toBe(true);
    expect(before.project.slides[0]?.title).not.toBe('A quieter opening');
  });
});
