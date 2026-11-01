import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { promisify } from 'node:util';
import { basename, join } from 'node:path';
import { z } from 'zod';
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

async function readBoundary(group: string, limit: number): Promise<RendererBoundary | null> {
  const cgroup = join('/sys/fs/cgroup', group);
  const [memory, swap, cpu] = await Promise.all(
    ['memory.max', 'memory.swap.max', 'cpu.max'].map((name) =>
      readFile(join(cgroup, name), 'utf8'),
    ),
  );
  const [quota, period] = (cpu ?? '').trim().split(/\s+/).map(Number);
  if (
    !Number.isFinite(Number(memory)) ||
    Number(memory) < 256 * 1024 * 1024 ||
    Number(memory) > limit ||
    Number(swap) !== 0 ||
    !Number.isFinite(quota) ||
    quota === undefined ||
    period === undefined ||
    quota > period
  )
    return null;
  return {
    unit: basename(group),
    cgroup,
    memoryLimitBytes: Number(memory),
    swapLimitBytes: Number(swap),
  };
}

export async function bindRendererBudget(pid: number): Promise<Result<RendererBoundary>> {
  if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid)
    return failure('INVALID_INPUT', 'An isolated scene process is required.');
  const setting = z.coerce
    .number()
    .int()
    .min(256)
    .max(1024)
    .safeParse(process.env.PREZI_SCENE_MEMORY_MB ?? 512);
  if (!setting.success)
    return failure(
      'INVALID_INPUT',
      'PREZI_SCENE_MEMORY_MB must be an integer between 256 and 1024.',
    );
  const limit = setting.data * 1024 * 1024;
  if (process.platform !== 'linux')
    return {
      ok: true,
      value: { unit: null, cgroup: null, memoryLimitBytes: null, swapLimitBytes: null },
    };
  const unit = `prezi-scene-${crypto.randomUUID()}.scope`;
  try {
    const current = (await readFile(`/proc/${String(pid)}/cgroup`, 'utf8')).trim().split('::')[1];
    if (current && /\/prezi-scene-[a-f0-9-]+\.scope$/.test(current)) {
      const existing = await readBoundary(current, limit);
      return existing
        ? { ok: true, value: existing }
        : failure('IO_ERROR', 'The existing scene resource boundary has invalid limits.');
    }
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
        String(limit),
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
      const boundary = await readBoundary(group, limit);
      return boundary
        ? { ok: true, value: boundary }
        : failure('IO_ERROR', 'The scene resource boundary could not be verified.');
    }
    return failure('IO_ERROR', 'The scene resource boundary did not become ready.');
  } catch (error) {
    const detail =
      error instanceof Error ? error.message.slice(0, 1000) : 'Unknown resource-boundary failure.';
    return failure('IO_ERROR', `Could not apply the scene resource boundary. ${detail}`);
  }
}
