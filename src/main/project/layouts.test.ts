import { expect, it } from 'vitest';
import { exampleOwner } from '../../../tests/fixtures/example-owner';
import { ProjectOwner } from './project-owner';

it('edits reusable code and process layouts through shared atomic history', () => {
  const owner = new ProjectOwner();
  const first = owner.snapshot().project.slides[0];
  if (!first) throw Error('Missing opening slide');
  const result = owner.edit({
    requestId: 'code-layout',
    expectedRevision: 0,
    label: 'Explain code',
    operations: [
      {
        type: 'updateSlide',
        slideId: first.id,
        patch: {
          layout: 'code',
          code: 'const answer = 42;\nreturn answer;',
          reveals: ['Name the value', 'Return it'],
        },
      },
    ],
  });
  expect(result.ok).toBe(true);
  expect(owner.snapshot().project.slides[0]).toMatchObject({
    layout: 'code',
    code: 'const answer = 42;\nreturn answer;',
  });
  expect(owner.undo(1).ok).toBe(true);
  expect(owner.snapshot().project.slides[0]?.layout).toBe('title');
  expect(
    owner.edit({
      requestId: 'too-many-stages',
      expectedRevision: 2,
      label: 'Oversized diagram',
      operations: [
        {
          type: 'updateSlide',
          slideId: first.id,
          patch: {
            layout: 'process',
            reveals: Array.from({ length: 7 }, (_, index) => `Stage ${index.toString()}`),
          },
        },
      ],
    }),
  ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
});

it('opens an explicit example with a real process diagram and a managed tiny video', async () => {
  const owner = await exampleOwner();
  const { slides } = owner.snapshot().project;
  expect(slides[1]?.layout).toBe('process');
  const media = slides[2]?.media;
  expect(media?.kind).toBe('video');
  if (!media) throw Error('Missing example video');
  expect(owner.mediaPath(media.id)).toContain(`${media.id}.webm`);
  expect(owner.snapshot()).toMatchObject({ revision: 1, dirty: false, canUndo: false });
});
