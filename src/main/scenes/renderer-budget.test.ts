import { expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { bindRendererBudget } from './renderer-budget';

it('places an owned renderer process behind a hard Linux memory and swap boundary', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  try {
    if (!child.pid) throw Error('No process');
    const boundary = await bindRendererBudget(child.pid);
    expect(boundary.ok).toBe(true);
    if (!boundary.ok) throw Error(boundary.error.message);
    expect(await bindRendererBudget(child.pid)).toEqual(boundary);
    if (process.platform === 'linux') {
      expect(boundary.value.memoryLimitBytes).toBe(512 * 1024 * 1024);
      expect(boundary.value.swapLimitBytes).toBe(0);
      const group = await readFile(`/proc/${String(child.pid)}/cgroup`, 'utf8');
      expect(group).toContain(boundary.value.unit);
      expect(await readFile(`${boundary.value.cgroup ?? ''}/memory.max`, 'utf8')).toBe(
        '536870912\n',
      );
    }
  } finally {
    child.kill();
  }
}, 10000);

it.skipIf(process.platform !== 'linux')(
  'honours a bounded renderer memory setting and rejects oversized limits',
  async () => {
    vi.stubEnv('PREZI_SCENE_MEMORY_MB', '256');
    const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    try {
      if (!child.pid) throw Error('No process');
      const boundary = await bindRendererBudget(child.pid);
      expect(boundary).toMatchObject({
        ok: true,
        value: { memoryLimitBytes: 256 * 1024 * 1024, swapLimitBytes: 0 },
      });
      if (!boundary.ok) throw Error(boundary.error.message);
      expect(await readFile(`${boundary.value.cgroup ?? ''}/memory.max`, 'utf8')).toBe(
        '268435456\n',
      );
      vi.stubEnv('PREZI_SCENE_MEMORY_MB', '8192');
      expect(await bindRendererBudget(child.pid)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_INPUT' },
      });
    } finally {
      child.kill();
      vi.unstubAllEnvs();
    }
  },
  10000,
);

it.skipIf(process.platform !== 'linux')(
  'reports the underlying resource-boundary failure',
  async () => {
    vi.stubEnv('DBUS_SESSION_BUS_ADDRESS', 'unix:path=/nonexistent/prezi-budget-bus');
    vi.stubEnv('LC_ALL', 'C');
    const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    try {
      if (!child.pid) throw Error('No process');
      const result = await bindRendererBudget(child.pid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('busctl');
        expect(result.error.message).toContain('No such file or directory');
      }
    } finally {
      child.kill();
      vi.unstubAllEnvs();
    }
  },
);
