import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, lineNumbers } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { sourceHighlight, sourceTheme } from './source-theme';

export function SourceCode({ name, source }: { name: string; source: string }): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return undefined;
    let language = javascript({ typescript: true, jsx: true });
    if (name.endsWith('.json')) language = json();
    if (name.endsWith('.css')) language = css();
    const view = new EditorView({
      parent: container.current,
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
        drawSelection(),
        language,
        syntaxHighlighting(sourceHighlight),
        sourceTheme,
      ],
    });
    return () => {
      view.destroy();
    };
  }, [name, source]);
  return <div ref={container} className="source-code" />;
}
