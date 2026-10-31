import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { compileScene } from './compile';

it('types programmable transition properties and numeric output without requiring a React component', async () => {
  const input: unknown = JSON.parse(await readFile('out/compiler/types.json', 'utf8'));
  const libraries = z.record(z.string(), z.string()).parse(input);
  const source = {
    entry: 'Transition.tsx',
    files: {
      'Transition.tsx': `import {interpolate} from 'remotion';
import type {TransitionProps,TransitionStyle} from 'prezi';
export default function transition({progress,direction,navigation,props}:TransitionProps):TransitionStyle {
 const sign = navigation === 'advance' ? 1 : -1;
 return {opacity: direction === 'entering' ? progress : 1-progress, x: sign * interpolate(progress,[0,1],direction === 'entering' ? [props.distance,0] : [0,-props.distance])};
}`,
    },
  };
  const fields = {
    distance: { type: 'number' as const, label: 'Distance', default: 10, min: 0, max: 100 },
  };
  const result = await compileScene(source, libraries, fields, 'transition');
  expect(result.ok).toBe(true);
  const bad = await compileScene(
    {
      ...source,
      files: {
        'Transition.tsx': source.files['Transition.tsx'].replace(
          "opacity: direction === 'entering' ? progress : 1-progress",
          "opacity: 'invalid'",
        ),
      },
    },
    libraries,
    fields,
    'transition',
  );
  expect(bad.ok).toBe(false);
  if (bad.ok) throw Error('Expected numeric style diagnostics');
  expect(bad.error.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ file: 'Transition.tsx', line: 5 })]),
  );
});

it('points inferred transition contract errors at the authored entry rather than an internal file', async () => {
  const input: unknown = JSON.parse(await readFile('out/compiler/types.json', 'utf8'));
  const libraries = z.record(z.string(), z.string()).parse(input);
  const result = await compileScene(
    {
      entry: 'Transition.tsx',
      files: { 'Transition.tsx': 'export default function transition(){return {opacity:"bad"};}' },
    },
    libraries,
    {},
    'transition',
  );
  expect(result.ok).toBe(false);
  if (result.ok) throw Error('Expected a transition type error');
  expect(result.error.diagnostics[0]).toMatchObject({ file: 'Transition.tsx', line: 1, column: 1 });
});
