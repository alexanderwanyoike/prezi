// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { playVideo } from './play-video';

it('treats an interrupted play request as normal cancellation', async () => {
  const video = document.createElement('video');
  vi.spyOn(video, 'play').mockRejectedValue(
    new DOMException('Playback was interrupted.', 'AbortError'),
  );
  expect(await playVideo(video)).toEqual({ ok: true, value: undefined });
});

it('retains a useful error for unsupported playback', async () => {
  const video = document.createElement('video');
  vi.spyOn(video, 'play').mockRejectedValue(
    new DOMException('Unsupported codec.', 'NotSupportedError'),
  );
  expect(await playVideo(video)).toMatchObject({ ok: false, error: { code: 'IO_ERROR' } });
});
