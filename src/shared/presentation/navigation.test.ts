import { expect, it } from 'vitest';
import { exampleProject } from '../../../tests/fixtures/example-project';
import { navigate, startPosition } from './navigation';

it('holds each reveal until advanced, walks backwards and leaves the final slide visible', () => {
  const project = exampleProject();
  const first = project.slides[0];
  const middle = project.slides[1];
  const last = project.slides[2];
  if (!first || !middle || !last) throw new Error('Expected the example deck');
  let position = startPosition(project);
  expect(position).toEqual({ slideId: first.id, reveal: 0 });
  expect(navigate(project, position, 'back')).toEqual(position);
  position = navigate(project, position, 'advance');
  expect(position).toEqual({ slideId: middle.id, reveal: 0 });
  middle.reveals.forEach((_reveal, index) => {
    position = navigate(project, position, 'advance');
    expect(position).toEqual({ slideId: middle.id, reveal: index + 1 });
  });
  position = navigate(project, position, 'advance');
  expect(position).toEqual({ slideId: last.id, reveal: 0 });
  expect(navigate(project, position, 'advance')).toEqual(position);
  position = navigate(project, position, 'back');
  expect(position).toEqual({ slideId: middle.id, reveal: middle.reveals.length });
  expect(navigate(project, position, 'back')).toEqual({
    slideId: middle.id,
    reveal: middle.reveals.length - 1,
  });
});
