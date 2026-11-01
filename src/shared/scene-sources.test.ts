import { expect, it } from 'vitest';
import { builtInSceneSources } from './scene-sources';

it('includes runtime media/text helpers and font loading in the self-contained source references', () => {
  expect(builtInSceneSources['scene-runtime/helpers.tsx']).toContain('function Media');
  expect(builtInSceneSources['renderer/useProjectFonts.ts']).toContain('loadProjectFont');
  expect(builtInSceneSources['renderer/load-project-font.ts']).toContain('new FontFace');
  expect(Object.keys(builtInSceneSources).some((name) => /\.test\.[jt]sx?$/.test(name))).toBe(
    false,
  );
});
