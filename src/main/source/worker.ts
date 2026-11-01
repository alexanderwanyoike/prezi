import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stop } from 'esbuild';
import { z } from 'zod';
import { sceneSourceSchema } from '../../shared/custom-scene';
import { sceneCandidateSchema } from '../../shared/scene-definition';
import { compileScene } from './compile';

async function resourceUsage() {
  if (process.platform !== 'linux')
    return {
      peakMemoryBytes: process.memoryUsage().rss,
      cpuMicros: process.cpuUsage().user + process.cpuUsage().system,
      memoryLimitBytes: null,
      swapLimitBytes: null,
    };
  const group = (await readFile('/proc/self/cgroup', 'utf8')).trim().split('::')[1];
  if (!group) throw new Error('A cgroup resource boundary is required.');
  const root = join('/sys/fs/cgroup', group);
  const [peak, cpu, memory, swap] = await Promise.all(
    ['memory.peak', 'cpu.stat', 'memory.max', 'memory.swap.max'].map((name) =>
      readFile(join(root, name), 'utf8'),
    ),
  );
  const memoryLimitBytes = Number(memory);
  const swapLimitBytes = Number(swap);
  if (
    !Number.isFinite(memoryLimitBytes) ||
    memoryLimitBytes > 1024 * 1024 * 1024 ||
    swapLimitBytes !== 0
  )
    throw new Error('The compiler requires at most 1 GiB RAM and zero swap.');
  return {
    peakMemoryBytes: Number(peak),
    cpuMicros: Number(cpu?.match(/usage_usec (\d+)/)?.[1] ?? 0),
    memoryLimitBytes,
    swapLimitBytes,
  };
}
async function run(): Promise<void> {
  const input = readFileSync(0, 'utf8');
  if (Buffer.byteLength(input) > 2 * 1024 * 1024)
    throw new Error('Source input exceeds its budget.');
  const raw: unknown = JSON.parse(input);
  const { fields, kind, ...source } = sceneSourceSchema
    .extend({
      fields: sceneCandidateSchema.shape.fields.default({}),
      kind: z.enum(['scene', 'transition']).default('scene'),
    })
    .parse(raw);
  const rawTypes: unknown = JSON.parse(
    await readFile(join(dirname(process.argv[1] ?? '.'), 'types.json'), 'utf8'),
  );
  const libraries = z.record(z.string(), z.string()).parse(rawTypes);
  const result = await compileScene(source, libraries, fields, kind);
  await stop();
  if (result.ok) result.value.resources = await resourceUsage();
  process.stdout.write(JSON.stringify(result));
}
run().catch(async (error: unknown) => {
  await stop();
  process.stdout.write(
    JSON.stringify({
      ok: false,
      error: {
        code: error instanceof z.ZodError ? 'INVALID_INPUT' : 'IO_ERROR',
        message: error instanceof Error ? error.message : 'Compiler worker failed.',
        diagnostics: [],
      },
    }),
  );
  process.exitCode = 1;
});
