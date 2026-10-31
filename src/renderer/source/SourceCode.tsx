import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, selectAll } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { SOURCE_SELECT_ALL } from './source-selection';
import { sourceHighlight, sourceTheme } from './source-theme';

export function SourceCode({ name, source }: { name: string; source: string }): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return undefined;
    const parent = container.current;
    let language = javascript({ typescript: true, jsx: true });
    if (name.endsWith('.json')) language = json();
    if (name.endsWith('.css')) language = css();
    const view = new EditorView({
      parent,
      doc: source,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({
          tabindex: '0',
          role: 'textbox',
          'aria-label': 'Scene source code',
          'aria-readonly': 'true',
          'aria-multiline': 'true',
        }),
        lineNumbers(),
        keymap.of(defaultKeymap),
        drawSelection(),
        language,
        syntaxHighlighting(sourceHighlight),
        sourceTheme,
      ],
    });
    const select = (): void => {
      view.focus();
      selectAll(view);
    };
    parent.addEventListener(SOURCE_SELECT_ALL, select);
    return () => {
      parent.removeEventListener(SOURCE_SELECT_ALL, select);
      view.destroy();
    };
  }, [name, source]);
  return <div ref={container} className="source-code" />;
}
