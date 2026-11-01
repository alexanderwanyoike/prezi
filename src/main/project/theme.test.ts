import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

it('applies one shared theme edit atomically and undoes it without changing slide content', () => {
  const owner = new ProjectOwner();
  const initial = owner.snapshot();
  expect(
    owner.edit({
      requestId: 'theme',
      expectedRevision: 0,
      label: 'Change presentation theme',
      operations: [
        {
          type: 'setTheme',
          patch: {
            background: '#f4f0e8',
            foreground: '#18221c',
            accent: '#00a65b',
            padding: 96,
            bodyFont: 'plex',
            animation: 'fade',
            transitionMs: 350,
          },
        },
      ],
    }).ok,
  ).toBe(true);
  expect(owner.snapshot().project.theme).toMatchObject({
    background: '#f4f0e8',
    padding: 96,
    bodyFont: 'plex',
    transitionMs: 350,
  });
  expect(owner.snapshot().project.slides).toEqual(initial.project.slides);
  const accepted = owner.snapshot();
  expect(
    owner.edit({
      requestId: 'invalid-theme',
      expectedRevision: 1,
      label: 'Invalid spacing',
      operations: [{ type: 'setTheme', patch: { padding: 500 } }],
    }),
  ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  expect(owner.snapshot()).toEqual(accepted);
  expect(owner.undo(1).ok).toBe(true);
  expect(owner.snapshot().project.theme).toEqual(initial.project.theme);
});
