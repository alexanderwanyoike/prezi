import type { ProjectFont } from '../../shared/fonts';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function fontHeader(header: Buffer, size: number): Result<ProjectFont['extension']> {
  if (size < 12 || size > 16 * 1024 * 1024)
    return failure('INVALID_INPUT', 'Choose a font between 12 bytes and 16 MiB.');
  const formats: Record<string, ProjectFont['extension']> = {
    OTTO: 'otf',
    wOFF: 'woff',
    wOF2: 'woff2',
    true: 'ttf',
    '00010000': 'ttf',
  };
  const extension =
    formats[header.toString('ascii', 0, 4)] ?? formats[header.toString('hex', 0, 4)];
  if (!extension) return failure('INVALID_INPUT', 'Choose a valid TTF, OTF, WOFF or WOFF2 font.');
  if (
    (extension === 'woff' || extension === 'woff2') &&
    (header.length < (extension === 'woff2' ? 48 : 44) ||
      header.readUInt32BE(16) > 64 * 1024 * 1024 ||
      header.readUInt32BE(16) < 12)
  )
    return failure('INVALID_INPUT', 'Compressed fonts must declare a decoded size within 64 MiB.');
  return { ok: true, value: extension };
}
