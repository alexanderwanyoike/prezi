import { open } from 'node:fs/promises';
import { extname } from 'node:path';
import { imageSize } from 'image-size';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

function inspect(bytes: Buffer, extension: string): Result<void> {
  try {
    const { width, height, type } = imageSize(bytes);
    if (!['png', 'jpg', 'webp', 'gif'].includes(type ?? '') || type !== extension)
      return failure('INVALID_INPUT', 'The image format must match its file extension.');
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width > 8192 ||
      height > 8192 ||
      width * height > 33554432
    )
      return failure(
        'INVALID_INPUT',
        'Images must be at most 8192 pixels per side and 32 megapixels.',
      );
    return { ok: true, value: undefined };
  } catch {
    return failure('INVALID_INPUT', 'Could not read a supported image header within 512 KiB.');
  }
}
export async function validateImage(path: string, size: number): Promise<Result<void>> {
  if (size > 32 * 1024 * 1024) return failure('INVALID_INPUT', 'Images must be at most 32 MiB.');
  try {
    const file = await open(path, 'r');
    try {
      const bytes = Buffer.alloc(Math.min(size, 512 * 1024));
      const read = await file.read(bytes, 0, bytes.length, 0);
      const extension = extname(path).slice(1).toLowerCase();
      return inspect(bytes.subarray(0, read.bytesRead), extension === 'jpeg' ? 'jpg' : extension);
    } finally {
      await file.close();
    }
  } catch {
    return failure('IO_ERROR', 'Could not read the local image file.');
  }
}
