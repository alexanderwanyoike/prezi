export const SOURCE_SELECT_ALL = 'prezi:source-select-all';

export function selectFocusedSource(): boolean {
  const source = document.activeElement?.closest('.source-code');
  if (!source) return false;
  source.dispatchEvent(new Event(SOURCE_SELECT_ALL));
  return true;
}
