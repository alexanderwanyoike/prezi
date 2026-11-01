import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { writeConnection } from './credentials';

const hook = vi.hoisted(() => ({ duringWrite: (): Promise<void> => Promise.resolve() }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    async writeFile(...args: Parameters<typeof actual.writeFile>) {
      // Widen the creation-to-write interval to expose the startup race deterministically.
      await actual.writeFile(args[0], '', { mode: 0o600 });
      await hook.duringWrite();
      const options =
        typeof args[2] === 'object' && args[2] !== null ? args[2] : { encoding: args[2] };
      await actual.writeFile(args[0], args[1], { ...options, flag: 'w' });
    },
  };
});

it('publishes only complete private connection files during startup and replacement', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-connection-'));
  const path = join(directory, 'mcp-connection.json');
  const observed: (string | null)[] = [];
  hook.duringWrite = async () => {
    observed.push(await readFile(path, 'utf8').catch(() => null));
  };
  try {
    expect(await writeConnection(directory, 'http://127.0.0.1:1000/mcp', 'first')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(observed).toEqual([null]);
    const first = await readFile(path, 'utf8');
    expect(JSON.parse(first)).toEqual({ url: 'http://127.0.0.1:1000/mcp', token: 'first' });
    expect(await writeConnection(directory, 'http://127.0.0.1:2000/mcp', 'second')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(observed).toEqual([null, first]);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      url: 'http://127.0.0.1:2000/mcp',
      token: 'second',
    });
    if (process.platform !== 'win32') expect((await stat(path)).mode % 0o1000).toBe(0o600);
  } finally {
    hook.duringWrite = () => Promise.resolve();
    await rm(directory, { recursive: true, force: true });
  }
});

it('retains the previous connection and removes temporary bytes after a failed replacement', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-connection-'));
  const path = join(directory, 'mcp-connection.json');
  try {
    await writeConnection(directory, 'http://127.0.0.1:1000/mcp', 'previous');
    const previous = await readFile(path, 'utf8');
    hook.duringWrite = () => Promise.reject(Error('Interrupted write'));
    expect(
      await writeConnection(directory, 'http://127.0.0.1:2000/mcp', 'replacement'),
    ).toMatchObject({ ok: false, error: { code: 'IO_ERROR' } });
    expect(await readFile(path, 'utf8')).toBe(previous);
    expect(await readdir(directory)).toEqual(['mcp-connection.json']);
  } finally {
    hook.duringWrite = () => Promise.resolve();
    await rm(directory, { recursive: true, force: true });
  }
});
