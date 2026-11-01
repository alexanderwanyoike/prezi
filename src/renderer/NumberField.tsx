import { useEffect, useRef, useState } from 'react';
import { failure } from '../shared/result';
import type { Result } from '../shared/result';
import { useEditPending } from './edit-pending';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  change: (value: number) => void;
}
function numberDraft(text: string, min: number, max: number): Result<number> {
  const value = Number(text);
  return !text.trim() || !Number.isFinite(value) || value < min || value > max
    ? failure('INVALID_INPUT', `Enter ${min.toString()} to ${max.toString()}.`)
    : { ok: true, value };
}
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  change,
}: Props): React.JSX.Element {
  const pending = useEditPending();
  const [draft, setDraft] = useState(value.toString());
  const latest = useRef(draft);
  latest.current = draft;
  const submitted = useRef(value);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const id = label.toLowerCase().replaceAll(' ', '-');
  useEffect(() => {
    if (pending) return;
    const text = latest.current;
    const local = numberDraft(text, min, max);
    const unfinished = !local.ok && (!text.trim() || Number(text) !== submitted.current);
    if (editing && unfinished) {
      if (value !== submitted.current) {
        setConflict(true);
        submitted.current = value;
      }
      return;
    }
    if (!editing || value !== submitted.current) {
      setDraft(value.toString());
      submitted.current = value;
      setConflict(false);
    }
  }, [value, pending, editing, min, max]);
  let description = conflict ? `${id}-conflict` : undefined;
  if (error) description = `${id}-error`;
  function commit(next: number): void {
    if (next !== submitted.current) {
      submitted.current = next;
      change(next);
    }
  }
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
        aria-describedby={description}
        onFocus={() => {
          setEditing(true);
        }}
        onChange={(event) => {
          const text = event.target.value;
          latest.current = text;
          setDraft(text);
          setError(null);
          const next = numberDraft(text, min, max);
          if (next.ok) {
            setConflict(false);
            commit(next.value);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            latest.current = value.toString();
            submitted.current = value;
            setDraft(latest.current);
            setError(null);
            setConflict(false);
            setEditing(false);
            event.currentTarget.blur();
          } else if (event.key === 'Enter') event.currentTarget.blur();
        }}
        onBlur={() => {
          const next = numberDraft(latest.current, min, max);
          if (!next.ok) {
            setError(next.error.message);
            return;
          }
          setError(null);
          setConflict(false);
          setEditing(false);
          commit(next.value);
        }}
      />
      {error && (
        <span id={`${id}-error`} className="field-hint" role="alert">
          {error}
        </span>
      )}
      {conflict && (
        <span id={`${id}-conflict`} className="field-hint" role="status">
          Changed elsewhere. Escape restores the accepted value.
        </span>
      )}
    </div>
  );
}
