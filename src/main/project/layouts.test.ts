import { expect, it } from 'vitest';
import { resolve } from 'node:path';
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

it('opens the Vibez example with a real process diagram and a managed tiny video', () => {
  const fixture = resolve('tests/fixtures/held-video.webm');
  const owner = new ProjectOwner(fixture);
  const { slides } = owner.snapshot().project;
  expect(slides[1]?.layout).toBe('process');
  const media = slides[2]?.media;
  expect(media?.kind).toBe('video');
  if (!media) throw Error('Missing example video');
  expect(owner.mediaPath(media.id)).toBe(fixture);
  expect(owner.snapshot()).toMatchObject({ revision: 0, dirty: false, canUndo: false });
});
