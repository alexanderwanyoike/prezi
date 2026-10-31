import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { textLayers } from '../../shared/text-scene';
import type { TextField } from '../../shared/text-scene';

export interface SceneEditing {
  selected: TextField | null;
  select: (field: TextField) => void;
  update: (field: TextField, value: string) => void;
}
interface Props {
  field: TextField;
  value: string;
  style: CSSProperties;
  editing?: SceneEditing | undefined;
}
function EditableSceneText({ field, value, style, editing }: Props): React.JSX.Element {
  const submitted = useRef(value);
  const element = useRef<HTMLElement | null>(null);
  const Tag = field === 'title' ? 'h2' : 'p';
  const layer = textLayers[field];
  const label = layer.label.toLowerCase();
  useLayoutEffect(() => {
    const node = element.current;
    // Native editing owns the focused DOM so accepted snapshots preserve the caret.
    if (node && node !== document.activeElement) {
      node.textContent = value;
      submitted.current = value;
    }
  }, [value]);
  return (
    <Tag
      ref={(node) => {
        element.current = node;
      }}
      style={style}
      className="editable-scene-text"
      data-selected={editing?.selected === field}
      data-placeholder={`Add ${label}`}
      contentEditable="plaintext-only"
      role="textbox"
      aria-label={`Canvas ${label}`}
      aria-multiline={field === 'body'}
      tabIndex={0}
      onFocus={() => editing?.select(field)}
      onInput={(event) => {
        const node = event.currentTarget;
        const text = node.innerText;
        const { maxLength } = layer;
        const next = text.slice(0, maxLength);
        if (text !== next) node.textContent = next;
        if (next !== submitted.current) {
          submitted.current = next;
          editing?.update(field, next);
        }
      }}
      onBlur={(event) => {
        const node = event.currentTarget;
        node.textContent = value;
        submitted.current = value;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && field === 'title')) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
export function SceneText(props: Props): React.JSX.Element | null {
  const { field, value, style, editing } = props;
  if (editing)
    return <EditableSceneText field={field} value={value} style={style} editing={editing} />;
  if (field === 'title') return <h2 style={style}>{value}</h2>;
  return value ? <p style={style}>{value}</p> : null;
}
