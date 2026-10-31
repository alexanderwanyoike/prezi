import { EditorView } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const sourceTheme = EditorView.theme({
  '&': { height: '100%', color: 'var(--text)', backgroundColor: 'var(--panel)' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '12px',
    lineHeight: '1.85',
  },
  '.cm-content': { padding: '18px 0', caretColor: 'var(--accent)' },
  '.cm-line': { padding: '0 20px' },
  '.cm-gutters': {
    backgroundColor: 'var(--sidebar)',
    color: 'var(--muted)',
    borderRight: '1px solid var(--line)',
    padding: '18px 8px 18px 4px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)',
  },
});
export const sourceHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.tagName, tags.bool, tags.null], color: 'var(--accent)' },
  { tag: [tags.string, tags.number, tags.attributeValue], color: 'var(--text)' },
  { tag: [tags.comment, tags.meta], color: 'var(--muted)', fontStyle: 'italic' },
  {
    tag: [tags.attributeName, tags.typeName, tags.function(tags.variableName)],
    color: 'var(--text)',
    fontWeight: '600',
  },
]);
