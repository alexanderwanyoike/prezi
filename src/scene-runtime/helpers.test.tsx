// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { sceneContext } from './context';
import { Media } from './helpers';
import type { RuntimeState } from '../shared/scene-runtime';

it('recovers a failed managed image when its resource identity changes', () => {
  const definition = { id: crypto.randomUUID(), name: 'Managed media', fields: {}, layers: [] };
  const state: RuntimeState = {
    title: '',
    body: '',
    reveal: 0,
    properties: {},
    media: { id: crypto.randomUUID(), name: 'Missing image', kind: 'image', extension: 'png' },
    editing: false,
    pending: false,
    active: false,
    autoplay: false,
    selectedLayer: null,
  };
  const emit = vi.fn();
  const view = render(
    <sceneContext.Provider value={{ definition, state, emit }}>
      <Media />
    </sceneContext.Provider>,
  );
  try {
    fireEvent.error(view.getByRole('img'));
    expect(view.queryByRole('alert')).not.toBeNull();
    const replacement = {
      ...state,
      media: {
        id: crypto.randomUUID(),
        name: 'Replacement image',
        kind: 'image' as const,
        extension: 'png' as const,
      },
    };
    view.rerender(
      <sceneContext.Provider value={{ definition, state: replacement, emit }}>
        <Media />
      </sceneContext.Provider>,
    );
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('img').getAttribute('src')).toBe(
      `prezi-media://asset/${replacement.media.id}`,
    );
  } finally {
    view.unmount();
  }
});
