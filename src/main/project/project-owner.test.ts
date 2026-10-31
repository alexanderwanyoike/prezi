import { describe, expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

describe('project editing', () => {
  it('applies a batch once and leaves content unchanged after stale or invalid requests', () => {
    const owner = new ProjectOwner();
    const before = owner.snapshot();
    const slide = before.project.slides[0];
    if (!slide) throw new Error('Expected an initial slide');
    const request = {
      requestId: 'batch',
      label: 'Opening',
      expectedRevision: 0,
      operations: [{ type: 'updateSlide', slideId: slide.id, patch: { title: 'New opening' } }],
    };
    expect(owner.edit(request).ok).toBe(true);
    const after = owner.snapshot();
    expect(owner.edit(request)).toEqual({ ok: true, value: after });
    expect(owner.snapshot()).toEqual(after);
    expect(owner.edit({ ...request, requestId: 'stale' })).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });
    expect(owner.edit({ ...request, label: 'Changed payload' })).toMatchObject({
      ok: false,
      error: { code: 'REQUEST_REUSED' },
    });
    expect(
      owner.edit({
        ...request,
        requestId: 'invalid-batch',
        expectedRevision: after.revision,
        operations: [
          ...request.operations,
          { type: 'updateSlide', slideId: crypto.randomUUID(), patch: { title: 'Missing' } },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(owner.snapshot()).toEqual(after);
  });
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
