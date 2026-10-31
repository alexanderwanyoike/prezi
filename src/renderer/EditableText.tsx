import { useEffect, useState } from 'react';

interface Props {
  id: string;
  value: string;
  commit: (value: string) => void;
  rows?: number;
  maxLength?: number;
  label?: string;
  className?: string;
}
export function EditableText({
  id,
  value,
  commit,
  rows,
  maxLength = 10000,
  label,
  className,
}: Props): React.JSX.Element {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  function finish(): void {
    setFocused(false);
    if (draft !== value) commit(draft);
  }
  if (rows !== undefined)
    return (
      <textarea
        id={id}
        aria-label={label}
        className={className}
        value={draft}
        rows={rows}
        maxLength={maxLength}
        onFocus={() => {
          setFocused(true);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={finish}
      />
    );
  return (
    <input
      id={id}
      aria-label={label}
      className={className}
      value={draft}
      maxLength={maxLength}
      onFocus={() => {
        setFocused(true);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={finish}
    />
  );
}
