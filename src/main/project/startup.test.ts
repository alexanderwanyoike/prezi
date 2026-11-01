import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

it('starts with the same empty unsaved project as New presentation', async () => {
  const owner = new ProjectOwner();
  try {
    const initial = owner.snapshot();
    expect(initial).toMatchObject({
      revision: 0,
      dirty: false,
      canUndo: false,
      canRedo: false,
      filePath: null,
      project: { name: 'Untitled presentation' },
    });
    expect(initial.project.slides).toHaveLength(1);
    expect(initial.project.slides[0]).toMatchObject({
      title: '',
      body: '',
      layout: 'title',
      reveals: [],
    });
    expect(initial.project.slides[0]?.media).toBeUndefined();
    const reset = await owner.reset(initial.revision);
    expect(reset.ok).toBe(true);
    const fresh = owner.snapshot();
    expect(fresh.project.name).toBe(initial.project.name);
    expect(fresh.project.slides).toHaveLength(1);
    expect(fresh.project.slides[0]).toEqual({
      ...initial.project.slides[0],
      id: fresh.project.slides[0]?.id,
    });
    expect(fresh.project.id).not.toBe(initial.project.id);
  } finally {
    await owner.dispose();
  }
});
