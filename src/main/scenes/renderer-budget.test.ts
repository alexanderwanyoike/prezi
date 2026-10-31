import { expect, it } from 'vitest';
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
