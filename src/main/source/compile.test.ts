import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { compileScene } from './compile';

it('rejects type errors and unapproved imports with useful diagnostics', async () => {
  const input: unknown = JSON.parse(await readFile('out/compiler/types.json', 'utf8'));
  const libraries = z.record(z.string(), z.string()).parse(input);
  const invalid = await compileScene(
    {
      entry: 'Scene.tsx',
      files: {
        'Scene.tsx':
          'const count: number = "wrong"; export default function Scene() { return <div>{count}</div>; }',
      },
    },
    libraries,
  );
  expect(invalid).toMatchObject({
    ok: false,
    error: {
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          file: 'Scene.tsx',
          line: 1,
          message: expect.stringContaining('not assignable'),
        }),
      ]),
    },
  });
  const denied = await compileScene(
    {
      entry: 'Scene.tsx',
      files: {
        'Scene.tsx':
          'import fs from "node:fs"; export default function Scene() { return <div>{fs.readFileSync("/etc/passwd", "utf8")}</div>; }',
      },
    },
    libraries,
  );
  expect(denied.ok).toBe(false);
});

it('bundles a React/Remotion scene and reports source locations without executing it', async () => {
  const compiled = await compileScene({
    entry: 'Scene.tsx',
    files: {
      'Scene.tsx': `import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {message} from './message';
export default function Scene() { return <AbsoluteFill>{message} {useCurrentFrame()}</AbsoluteFill>; }`,
      'message.ts': 'export const message = "A working scene";',
    },
  });
  expect(compiled).toMatchObject({
    ok: true,
    value: { code: expect.stringContaining('A working scene') },
  });
  const invalid = await compileScene({
    entry: 'Scene.tsx',
    files: { 'Scene.tsx': 'export default function Scene() { return <div>;' },
  });
  expect(invalid).toMatchObject({
    ok: false,
    error: { diagnostics: [expect.objectContaining({ file: 'Scene.tsx', line: 1 })] },
  });
});
