import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export interface ByteRange {
  start: number;
  end: number;
}
export function byteRange(header: string | null, size: number): Result<ByteRange | null> {
  const match = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
  if (!match || (!match[1] && !match[2])) return { ok: true, value: null };
  if ([match[1], match[2]].some((part) => part && !Number.isSafeInteger(Number(part))))
    return failure('INVALID_INPUT', 'The requested byte offset is too large.');
  const from = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const to = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from > to ||
    from >= size ||
    (!match[1] && Number(match[2]) === 0)
  )
    return failure('INVALID_INPUT', 'The requested byte range is outside this file.');
  return { ok: true, value: { start: from, end: to } };
}
