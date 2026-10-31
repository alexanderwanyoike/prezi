import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { consumeResume, rememberResume } from './resume-project';

test('reopens the saved deck after an update once and clears an abandoned resume pointer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-resume-'));
  try {
    const path = join(directory, 'my deck.prezi');
    expect((await rememberResume(directory, path)).ok).toBe(true);
    expect(await consumeResume(directory)).toEqual({ ok: true, value: path });
    expect(await consumeResume(directory)).toEqual({ ok: true, value: null });
    expect((await rememberResume(directory, path)).ok).toBe(true);
    expect((await rememberResume(directory, null)).ok).toBe(true);
    expect(await consumeResume(directory)).toEqual({ ok: true, value: null });
    expect((await rememberResume(directory, 'relative.prezi')).ok).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
