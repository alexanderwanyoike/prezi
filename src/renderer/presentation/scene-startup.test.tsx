// @vitest-environment jsdom
import { cleanup, render, fireEvent, waitFor, act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { runtimeMessageSchema } from '../../shared/scene-runtime';
import { CustomScenePlayer } from './CustomScenePlayer';

it('waits for the isolated runtime to subscribe before delivering scene code', async () => {
  const prepare = vi.fn(() => Promise.resolve({ ok: true, value: true }));
  vi.stubGlobal('prezi', {
    prepareScene: prepare,
    stopScene: () => Promise.resolve({ ok: true, value: true }),
  });
  try {
    const id = crypto.randomUUID();
    const definition = {
      id,
      name: 'Scene',
      fields: {},
      layers: [],
      source: { entry: 'Scene.tsx', files: { 'Scene.tsx': 'export default()=>null' } },
      code: 'export default()=>null',
    };
    const view = render(
      <CustomScenePlayer
        definition={definition}
        still={false}
        scene={{
          slide: {
            id,
            title: 'Scene',
            body: '',
            reveals: [],
            layout: 'title',
            scene: { definitionId: id, properties: {} },
          },
          reveal: 0,
          slideNumber: 1,
          slideCount: 1,
        }}
      />,
    );
    const iframe = view.getByTitle('Custom scene');
    if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) throw Error('No frame');
    const child = iframe.contentWindow;
    const send = vi.spyOn(child, 'postMessage');
    const loaded = () =>
      send.mock.calls.some((args) => {
        const input: unknown = args[0];
        const parsed = runtimeMessageSchema.safeParse(input);
        return parsed.success && parsed.data.type === 'prezi:load';
      });
    fireEvent.load(iframe);
    await waitFor(() => {
      expect(prepare).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(loaded()).toBe(false);
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          source: child,
          data: { type: 'prezi:boot', instance: new URL(iframe.src).hostname },
        }),
      );
    });
    await waitFor(() => {
      expect(loaded()).toBe(true);
    });
  } finally {
    cleanup();
    vi.unstubAllGlobals();
  }
});

it.each(['never loads', 'preparation stalls', 'only heartbeats'])(
  'recovers when a custom scene %s',
  async (mode) => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const stopped = vi.fn(() => Promise.resolve({ ok: true, value: true }));
    vi.stubGlobal('prezi', {
      prepareScene: () =>
        mode === 'preparation stalls'
          ? new Promise<never>(() => {
              /* This bridge intentionally never replies. */
            })
          : Promise.resolve({ ok: true, value: true }),
      stopScene: stopped,
    });
    const ready = vi.fn();
    try {
      const id = crypto.randomUUID();
      const definition = {
        id,
        name: 'Scene',
        fields: {},
        layers: [],
        source: { entry: 'Scene.tsx', files: { 'Scene.tsx': 'export default()=>null' } },
        code: 'export default()=>null',
      };
      const view = render(
        <CustomScenePlayer
          definition={definition}
          still={false}
          onReady={ready}
          scene={{
            slide: {
              id,
              title: '',
              body: '',
              reveals: [],
              layout: 'title',
              scene: { definitionId: id, properties: {} },
            },
            reveal: 0,
            slideNumber: 1,
            slideCount: 1,
          }}
        />,
      );
      const iframe = view.getByTitle('Custom scene');
      if (!(iframe instanceof HTMLIFrameElement)) throw Error('Missing frame');
      if (mode !== 'never loads') fireEvent.load(iframe);
      await act(async () => {
        await Promise.resolve();
      });
      const beat = setInterval(() => {
        if (mode === 'only heartbeats')
          window.dispatchEvent(
            new MessageEvent('message', {
              source: iframe.contentWindow,
              data: { type: 'prezi:heartbeat' },
            }),
          );
      }, 500);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11000);
      });
      clearInterval(beat);
      expect(view.getByRole('alert').textContent).toContain('did not become ready');
      expect(view.queryByTitle('Custom scene')).toBeNull();
      expect(ready).toHaveBeenCalledTimes(1);
      expect(stopped).toHaveBeenCalledWith(new URL(iframe.src).hostname);
    } finally {
      cleanup();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  },
);
