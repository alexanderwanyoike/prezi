import { expect, it } from 'vitest';
import { compileScene } from './compile';

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
