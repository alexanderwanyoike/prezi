// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EditableText } from './EditableText';
import { SceneText } from './presentation/SceneText';

it('shows an accepted external edit in a focused inspector field without recommitting it', () => {
  const commit = vi.fn();
  const view = render(<EditableText id="heading" label="Heading" value="Before" commit={commit} />);
  try {
    const input = view.getByRole('textbox');
    act(() => {
      input.focus();
    });
    view.rerender(
      <EditableText id="heading" label="Heading" value="Accepted elsewhere" commit={commit} />,
    );
    if (!(input instanceof HTMLInputElement)) throw Error('Expected an input');
    expect(input.value).toBe('Accepted elsewhere');
    expect(document.activeElement).toBe(input);
    expect(commit).not.toHaveBeenCalled();
  } finally {
    view.unmount();
  }
});

it('shows an accepted external edit in a focused canvas layer without recommitting it', () => {
  const editing = { selected: 'title' as const, pending: false, select: vi.fn(), update: vi.fn() };
  const view = render(<SceneText field="title" value="Before" style={{}} editing={editing} />);
  try {
    const input = view.getByRole('textbox');
    act(() => {
      input.focus();
    });
    view.rerender(
      <SceneText field="title" value="Accepted elsewhere" style={{}} editing={editing} />,
    );
    expect(input.textContent).toBe('Accepted elsewhere');
    expect(document.activeElement).toBe(input);
    expect(editing.update).not.toHaveBeenCalled();
  } finally {
    view.unmount();
  }
});
