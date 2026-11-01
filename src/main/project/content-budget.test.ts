import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

it('rejects a UTF-8 project that could not be reopened within the saved-content limit', () => {
  const owner = new ProjectOwner();
  const initial = owner.snapshot();
  const operations = Array.from({ length: 70 }, (_, index) => ({
    type: 'addSlide',
    index: index + 3,
    slide: {
      id: crypto.randomUUID(),
      title: 'A large slide',
      body: '😀'.repeat(5000),
      layout: 'content',
      reveals: Array.from({ length: 30 }, () => '😀'.repeat(1000)),
    },
  }));
  const result = owner.edit({
    requestId: 'too-large',
    expectedRevision: 0,
    label: 'Large source context',
    operations,
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw Error('Expected the content budget to reject the batch');
  expect(result.error.code).toBe('INVALID_INPUT');
  expect(owner.snapshot()).toEqual(initial);
});
