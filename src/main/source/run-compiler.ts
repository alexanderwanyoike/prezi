import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { SceneCandidate } from '../../shared/scene-definition';
import { compilationSchema, sceneSourceSchema } from '../../shared/custom-scene';
import type { Compilation, SceneSource } from '../../shared/custom-scene';

export async function runCompiler(
  source: SceneSource,
  signal: AbortSignal,
  directory = join(process.cwd(), 'out/compiler'),
  _fields: SceneCandidate['fields'] = {},
): Promise<Compilation> {
  const failed = (message: string): Compilation => ({
    ok: false,
    error: { code: 'INVALID_INPUT', message, diagnostics: [] },
  });
  if (signal.aborted) return failed('Scene compilation was cancelled.');
  if (!sceneSourceSchema.safeParse(source).success)
    return failed('The scene source exceeds its limits.');
  const unit = `prezi-compile-${crypto.randomUUID()}`;
  const limitInput = Number(process.env.PREZI_WORKER_MEMORY_MB ?? 1024);
  const limit = Number.isFinite(limitInput)
    ? Math.max(256, Math.min(1024, Math.floor(limitInput)))
    : 1024;
  const worker = [
    process.execPath,
    `--max-old-space-size=${String(Math.min(512, Math.floor(limit / 2)))}`,
    join(directory, 'worker.cjs'),
  ];
  const linux = process.platform === 'linux';
  const args = linux
    ? [
        '--user',
        '--quiet',
        '--wait',
        '--pipe',
        '--setenv=ELECTRON_RUN_AS_NODE=1',
        '--setenv=GOMAXPROCS=1',
        '--setenv=NODE_OPTIONS=',
        `--unit=${unit}`,
        `--property=MemoryMax=${String(limit)}M`,
        '--property=MemorySwapMax=0',
        '--property=CPUQuota=100%',
        '--property=TasksMax=64',
        '--property=RuntimeMaxSec=25',
        '--property=KillMode=control-group',
        ...worker,
      ]
    : worker.slice(1);
  return new Promise((resolve) => {
    const child = spawn(linux ? 'systemd-run' : process.execPath, args, {
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', GOMAXPROCS: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    let stderr = '';
    let stopped: string | null = null;
    const terminate = (message: string): void => {
      if (stopped) return;
      stopped = message;
      if (linux) {
        const cleanup = spawn('systemctl', ['--user', 'stop', unit], { stdio: 'ignore' });
        cleanup.on('error', () => undefined);
      } else child.kill();
    };
    const abort = (): void => {
      terminate('Scene compilation was cancelled.');
    };
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => {
      terminate('Scene compilation exceeded its 25-second limit.');
    }, 25000);
    child.stdout.on('data', (chunk: Buffer) => {
      if (Buffer.byteLength(output) + chunk.length > 2200000)
        terminate('Compiler output exceeded its limit.');
      else output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 4000) stderr += chunk.toString('utf8').slice(0, 4000 - stderr.length);
    });
    child.stdin.on('error', () => undefined);
    child.on('error', () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      resolve(failed('The bounded compiler could not start.'));
    });
    child.on('close', () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      if (stopped) {
        resolve(failed(stopped));
        return;
      }
      try {
        const input: unknown = JSON.parse(output);
        const parsed = compilationSchema.safeParse(input);
        resolve(
          parsed.success ? parsed.data : failed('The compiler returned an invalid response.'),
        );
      } catch {
        resolve(
          failed(
            linux
              ? `The bounded compiler could not complete. Check the user systemd session. ${stderr}`
              : 'The compiler process could not complete.',
          ),
        );
      }
    });
    child.stdin.end(JSON.stringify(source));
    if (signal.aborted) abort();
  });
}
