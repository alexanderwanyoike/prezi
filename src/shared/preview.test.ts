import { expect, it } from 'vitest';
import { createProject, projectSchema } from './project';
import { previewKey } from './preview';

it('recognizes the same rendered content after validation reorders its object keys', () => {
  const project = createProject();
  const normalized = projectSchema.parse(project);
  const original = project.slides[0];
  const accepted = normalized.slides[0];
  if (!original || !accepted) throw Error('No slide');
  expect(previewKey(project, original)).toBe(previewKey(normalized, accepted));
  expect(previewKey(project, { ...original, title: 'Changed' })).not.toBe(
    previewKey(project, original),
  );
});
