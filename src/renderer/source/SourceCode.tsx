import { useEffect, useRef } from 'react';
import { Annotation, EditorState, Transaction } from '@codemirror/state';
import { drawSelection, EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, selectAll } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { SOURCE_SELECT_ALL } from './source-selection';
import { sourceHighlight, sourceTheme } from './source-theme';

const externalUpdate = Annotation.define<boolean>();
export function SourceCode({
  name,
  source,
  editable = false,
  pending = false,
  maxLength = 250000,
  change,
}: {
  name: string;
  source: string;
  editable?: boolean;
  pending?: boolean;
  maxLength?: number;
  change?: ((text: string) => void) | undefined;
}): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const latest = useRef({ source, change });
  latest.current = { source, change };
  useEffect(() => {
    if (!container.current) return undefined;
    const parent = container.current;
    let language = javascript({ typescript: true, jsx: true });
    if (name.endsWith('.json')) language = json();
    if (name.endsWith('.css')) language = css();
    const view = new EditorView({
      parent,
      doc: latest.current.source,
      extensions: [
        EditorState.readOnly.of(!editable),
        EditorView.editable.of(editable),
        EditorView.contentAttributes.of({
          tabindex: '0',
          role: 'textbox',
          'aria-label': 'Scene source code',
          'aria-readonly': String(!editable),
          'aria-multiline': 'true',
        }),
        EditorState.transactionFilter.of((transaction) =>
          transaction.docChanged && transaction.newDoc.length > maxLength ? [] : transaction,
        ),
        EditorView.updateListener.of((update) => {
          if (
            update.docChanged &&
            !update.transactions.some((transaction) => transaction.annotation(externalUpdate))
          )
            latest.current.change?.(update.state.doc.toString());
        }),
        lineNumbers(),
        history(),
        keymap.of([...historyKeymap, ...defaultKeymap]),
        drawSelection(),
        language,
        syntaxHighlighting(sourceHighlight),
        sourceTheme,
      ],
    });
    editor.current = view;
    const select = (): void => {
      view.focus();
      selectAll(view);
    };
    parent.addEventListener(SOURCE_SELECT_ALL, select);
    if (editable) view.focus();
    return () => {
      editor.current = null;
      parent.removeEventListener(SOURCE_SELECT_ALL, select);
      view.destroy();
    };
  }, [name, editable, maxLength]);
  useEffect(() => {
    const view = editor.current;
    if (!view || (editable && pending) || view.state.doc.toString() === source) return;
    const anchor = Math.min(view.state.selection.main.anchor, source.length);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: source },
      selection: { anchor },
      annotations: [externalUpdate.of(true), Transaction.addToHistory.of(false)],
    });
  }, [source, pending, editable]);
  return <div ref={container} className="source-code" />;
}
