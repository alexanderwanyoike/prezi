import { build } from 'esbuild';

await build({
  entryPoints: ['src/main/source/worker.ts'],
  outfile: 'out/compiler/worker.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  external: ['esbuild'],
  logLevel: 'warning',
});
