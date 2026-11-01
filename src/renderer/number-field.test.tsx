// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { NumberField } from './NumberField';

it('adopts accepted numeric values while a focused field has no unfinished draft', () => {
  const change = vi.fn();
  const view = render(
    <NumberField label="Position" value={1000} min={0} max={1200} change={change} />,
  );
  try {
    const field = view.getByRole('spinbutton');
    act(() => {
      field.focus();
    });
    view.rerender(<NumberField label="Position" value={900} min={0} max={1200} change={change} />);
    if (!(field instanceof HTMLInputElement)) throw Error('No numeric field');
    expect(field.value).toBe('900');
    expect(document.activeElement).toBe(field);
    expect(change).not.toHaveBeenCalled();
  } finally {
    view.unmount();
  }
});

it('commits valid numbers without blur and preserves an unfinished draft until Escape accepts the incoming value', () => {
  const change = vi.fn();
  const view = render(
    <NumberField label="Position" value={1000} min={0} max={1200} change={change} />,
  );
  try {
    const field = view.getByRole('spinbutton');
    act(() => {
      field.focus();
    });
    fireEvent.change(field, { target: { value: '850' } });
    expect(change).toHaveBeenCalledExactlyOnceWith(850);
    fireEvent.change(field, { target: { value: '' } });
    view.rerender(<NumberField label="Position" value={900} min={0} max={1200} change={change} />);
    if (!(field instanceof HTMLInputElement)) throw Error('No numeric field');
    expect(field.value).toBe('');
    expect(view.getByRole('status').textContent).toContain('Changed elsewhere');
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field.value).toBe('900');
    expect(change).toHaveBeenCalledTimes(1);
  } finally {
    view.unmount();
  }
});
