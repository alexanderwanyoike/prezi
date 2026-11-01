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
    await act(() => {
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
