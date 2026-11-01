import { expect, it } from 'vitest';
import { presentationAction } from './keyboard';

it('accepts deliberate navigation while ignoring held keys, typing, shortcuts and busy transitions', () => {
  const input = { key: ' ', repeat: false, ctrlKey: false, metaKey: false, altKey: false };
  expect(presentationAction(input, false, false)).toBe('advance');
  expect(presentationAction({ ...input, key: 'ArrowRight' }, false, false)).toBe('advance');
  expect(presentationAction({ ...input, key: 'ArrowLeft' }, false, false)).toBe('back');
  expect(presentationAction({ ...input, repeat: true }, false, false)).toBeNull();
  expect(presentationAction(input, true, false)).toBeNull();
  expect(presentationAction(input, false, true)).toBeNull();
  expect(presentationAction({ ...input, ctrlKey: true }, false, false)).toBeNull();
  expect(presentationAction({ ...input, key: 'Escape' }, false, true)).toBe('exit');
});
