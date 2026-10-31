import { useEffect, useState } from 'react';
import { useEditPending } from './edit-pending';

interface Props {
  id: string;
  onFocus?: () => void;
  value: string;
  commit: (value: string) => void;
  rows?: number | undefined;
  maxLength?: number;
  label?: string;
  className?: string;
}
export function EditableText({
  id,
  onFocus,
  value,
  commit,
  rows,
  maxLength = 10000,
  label,
  className,
}: Props): React.JSX.Element {
  const [draft, setDraft] = useState(value);
  const pending = useEditPending();
  useEffect(() => {
    if (!pending) setDraft(value);
  }, [value, pending]);
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
          onFocus?.();
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
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
        onFocus?.();
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        commit(event.target.value);
      }}
    />
  );
}
