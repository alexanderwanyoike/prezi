import { expect, test } from 'vitest';
import { byteRange } from './byte-range';

test('honours open-ended and suffix ranges and rejects unsatisfiable requests', () => {
  expect(byteRange('bytes=12-', 100)).toEqual({ ok: true, value: { start: 12, end: 99 } });
  expect(byteRange('bytes=-8', 100)).toEqual({ ok: true, value: { start: 92, end: 99 } });
  expect(byteRange('bytes=95-200', 100)).toEqual({ ok: true, value: { start: 95, end: 99 } });
  expect(byteRange('bytes=100-', 100)).toMatchObject({ ok: false });
  expect(byteRange('bytes=-0', 100)).toMatchObject({ ok: false });
  expect(byteRange('bytes=4-2', 100)).toMatchObject({ ok: false });
  expect(byteRange('bytes=0-', 0)).toMatchObject({ ok: false });
  expect(byteRange('bytes=-99999999999999999999999999', 100)).toMatchObject({ ok: false });
  expect(byteRange('bytes=0-5,8-10', 100)).toEqual({ ok: true, value: null });
});
