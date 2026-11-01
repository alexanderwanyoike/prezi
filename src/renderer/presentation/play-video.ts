import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function playVideo(video: HTMLVideoElement): Promise<Result<void>> {
  try {
    await video.play();
    return { ok: true, value: undefined };
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    )
      return { ok: true, value: undefined };
    return failure(
      'IO_ERROR',
      'Video could not start. Click Play or check that its codec is supported.',
    );
  }
}
