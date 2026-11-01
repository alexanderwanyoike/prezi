import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { compileScene } from './compile';

it('exposes attached media and the actual reveal text to typed custom scenes', async () => {
  const input: unknown = JSON.parse(await readFile('out/compiler/types.json', 'utf8'));
  const libraries = z.record(z.string(), z.string()).parse(input);
  const result = await compileScene(
    {
      entry: 'Scene.tsx',
      files: {
        'Scene.tsx': `import {Media} from 'prezi';
import type {SceneProps} from 'prezi';
export default function Scene({reveal,reveals,hasMedia}:SceneProps){return <>{reveals.slice(0,reveal).map((text)=><p key={text}>{text}</p>)}{hasMedia&&<Media/>}</>;}`,
      },
    },
    libraries,
  );
  expect(result.ok).toBe(true);
});
