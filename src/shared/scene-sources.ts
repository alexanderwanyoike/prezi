const sceneFiles = import.meta.glob<string>(
  [
    '../renderer/presentation/*.{ts,tsx}',
    '../renderer/styles/{tokens,presentation,editor}.css',
    './*.ts',
    './presentation/*.ts',
    '!./**/*.test.ts',
    '!./scene-sources.ts',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

export const builtInSceneSources: Record<string, string> = Object.fromEntries(
  Object.entries(sceneFiles).map(([path, source]) => [
    path.startsWith('../') ? path.slice(3) : `shared/${path.slice(2)}`,
    source,
  ]),
);
