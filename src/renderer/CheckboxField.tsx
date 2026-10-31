import { useEffect, useState } from 'react';

export function CheckboxField({
  label,
  value,
  change,
}: {
  label: string;
  value: boolean;
  change: (value: boolean) => void;
}): React.JSX.Element {
  const [checked, setChecked] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setChecked(value);
  }, [value, focused]);
  return (
    <label className="media-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        onChange={(event) => {
          setChecked(event.target.checked);
          change(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}
