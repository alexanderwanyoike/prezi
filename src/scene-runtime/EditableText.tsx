import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

export function EditableText({
  value,
  label,
  style,
  multiline,
  pending,
  update,
}: {
  value: string;
  label: string;
  style: CSSProperties | undefined;
  multiline: boolean;
  pending: boolean;
  update: (value: string) => void;
}): React.JSX.Element {
  const node = useRef<HTMLSpanElement>(null);
  const submitted = useRef(value);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    if (element !== document.activeElement || (!pending && value !== submitted.current)) {
      element.textContent = value;
      submitted.current = value;
    }
  }, [value, pending]);
  return (
    <span
      ref={node}
      style={style}
      className="editable-scene-text"
      contentEditable="plaintext-only"
      role="textbox"
      aria-label={`Canvas ${label.toLowerCase()}`}
      aria-multiline={multiline}
      tabIndex={0}
      onInput={(event) => {
        const element = event.currentTarget;
        const text = (element.textContent ? element.innerText : '').slice(0, 10000);
        if (text !== submitted.current) {
          submitted.current = text;
          update(text);
        }
      }}
      onBlur={(event) => {
        const { currentTarget } = event;
        currentTarget.textContent = value;
        submitted.current = value;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || (!multiline && event.key === 'Enter')) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
