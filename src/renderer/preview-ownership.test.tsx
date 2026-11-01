// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { PreviewJob, PreviewRequest } from '../shared/preview';
import { usePreviews } from './usePreviews';

it('keeps agent previews shared without adopting their pending controls or errors', async () => {
  let receive: (job: PreviewJob) => void = () => undefined;
  const request: PreviewRequest = {
    requestId: 'preview:human',
    expectedRevision: 0,
    slideId: crypto.randomUUID(),
    reveal: 0,
  };
  const queued: PreviewJob = {
    id: 'preview:agent',
    slideId: request.slideId,
    revision: 0,
    key: 'key',
    state: 'queued',
  };
  const capturePreview = vi.fn(() =>
    Promise.resolve({ ok: true as const, value: { ...queued, id: request.requestId } }),
  );
  Object.defineProperty(window, 'prezi', {
    configurable: true,
    value: {
      subscribePreviews: (listener: (job: PreviewJob) => void) => {
        receive = listener;
        return () => undefined;
      },
      previews: () => Promise.resolve({ ok: true, value: [] }),
      capturePreview,
      cancelPreview: vi.fn(),
    },
  });
  const view = renderHook(usePreviews);
  try {
    await act(async () => {
      receive(queued);
      await Promise.resolve();
    });
    expect(view.result.current.jobs).toEqual([queued]);
    act(() => {
      receive({
        ...queued,
        state: 'failed',
        error: { code: 'IO_ERROR', message: 'Agent capture failed' },
      });
    });
    expect(view.result.current.error).toBeNull();
    expect(view.result.current).toHaveProperty('pending', undefined);
    act(() => {
      view.result.current.capture(request);
    });
    await waitFor(() => {
      expect(view.result.current).toHaveProperty('pending.id', request.requestId);
    });
    act(() => {
      receive({
        ...queued,
        id: request.requestId,
        state: 'failed',
        error: { code: 'IO_ERROR', message: 'Your capture failed' },
      });
    });
    expect(view.result.current.error).toBe('Your capture failed');
    expect(view.result.current).toHaveProperty('pending', undefined);
    act(() => {
      receive({
        ...queued,
        state: 'complete',
        image: { dataUrl: 'data:image/jpeg;base64,a', width: 960, height: 540 },
      });
    });
    expect(view.result.current.jobs.find((job) => job.id === queued.id)?.image).toBeDefined();
  } finally {
    view.unmount();
    Reflect.deleteProperty(window, 'prezi');
    vi.unstubAllGlobals();
  }
});
