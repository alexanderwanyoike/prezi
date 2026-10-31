import { useEffect, useState } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  change: (value: number) => void;
}
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  change,
}: Props): React.JSX.Element {
  const [draft, setDraft] = useState(value.toString());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = label.toLowerCase().replaceAll(' ', '-');
  useEffect(() => {
    if (!editing) setDraft(value.toString());
  }, [value, editing]);
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        required
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        onFocus={() => {
          setEditing(true);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        onBlur={() => {
          const next = Number(draft);
          if (!draft.trim() || !Number.isFinite(next) || next < min || next > max) {
            setError(`Enter ${min.toString()} to ${max.toString()}.`);
            return;
          }
          setError(null);
          setEditing(false);
          if (next !== value) change(next);
        }}
      />
      {error && (
        <span id={`${id}-error`} className="field-hint" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
