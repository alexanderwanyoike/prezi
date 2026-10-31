type Input = Pick<KeyboardEvent, 'key' | 'repeat' | 'ctrlKey' | 'metaKey' | 'altKey'>;
export function presentationAction(
  input: Input,
  typing: boolean,
  busy: boolean,
): 'advance' | 'back' | 'exit' | null {
  if (typing || input.repeat || input.ctrlKey || input.metaKey || input.altKey) return null;
  if (input.key === 'Escape') return 'exit';
  if (busy) return null;
  if (input.key === ' ' || input.key === 'ArrowRight') return 'advance';
  if (input.key === 'ArrowLeft') return 'back';
  return null;
}
