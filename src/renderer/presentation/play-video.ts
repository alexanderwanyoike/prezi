import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function playVideo(video: HTMLVideoElement): Promise<Result<void>> {
  try {
    await video.play();
    return { ok: true, value: undefined };
  } catch {
    return failure(
      'IO_ERROR',
      'Video could not start. Click Play or check that its codec is supported.',
    );
  }
}
