import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { promisify } from 'node:util';
import { join } from 'node:path';
import type { Result } from '../../shared/result';
import { failure } from '../../shared/result';

export interface RendererBoundary {
  unit: string | null;
  cgroup: string | null;
  memoryLimitBytes: number | null;
  swapLimitBytes: number | null;
}
async function waitForGroup(pid: number, unit: string, attempt = 0): Promise<string | null> {
  const group = (await readFile(`/proc/${String(pid)}/cgroup`, 'utf8')).trim().split('::')[1];
  if (group?.endsWith(unit)) return group;
  if (attempt >= 100) return null;
  await pause(20);
  return waitForGroup(pid, unit, attempt + 1);
}

export async function bindRendererBudget(pid: number): Promise<Result<RendererBoundary>> {
  if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid)
    return failure('INVALID_INPUT', 'An isolated scene process is required.');
  if (process.platform !== 'linux')
    return {
      ok: true,
      value: { unit: null, cgroup: null, memoryLimitBytes: null, swapLimitBytes: null },
    };
  const unit = `prezi-scene-${crypto.randomUUID()}.scope`;
  try {
    await promisify(execFile)(
      'busctl',
      [
        '--user',
        'call',
        'org.freedesktop.systemd1',
        '/org/freedesktop/systemd1',
        'org.freedesktop.systemd1.Manager',
        'StartTransientUnit',
        'ssa(sv)a(sa(sv))',
        unit,
        'fail',
        '5',
        'PIDs',
        'au',
        '1',
        String(pid),
        'MemoryMax',
        't',
        '536870912',
        'MemorySwapMax',
        't',
        '0',
        'CPUQuotaPerSecUSec',
        't',
        '1000000',
        'Description',
        's',
        'Prezi isolated scene',
        '0',
      ],
      { timeout: 4000, windowsHide: true, maxBuffer: 16384 },
    );
    const group = await waitForGroup(pid, unit);
    if (group) {
      const cgroup = join('/sys/fs/cgroup', group);
      const [memory, swap] = await Promise.all(
        ['memory.max', 'memory.swap.max'].map((name) => readFile(join(cgroup, name), 'utf8')),
      );
      if (Number(memory) !== 536870912 || Number(swap) !== 0)
        return failure('IO_ERROR', 'The scene memory boundary could not be verified.');
      return {
        ok: true,
        value: { unit, cgroup, memoryLimitBytes: Number(memory), swapLimitBytes: Number(swap) },
      };
    }
    return failure('IO_ERROR', 'The scene resource boundary did not become ready.');
  } catch {
    return failure(
      'IO_ERROR',
      'A user systemd session with cgroup limits is required for custom scenes.',
    );
  }
}
