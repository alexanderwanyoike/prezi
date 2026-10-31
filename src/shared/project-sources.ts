import type { Project } from './project';
import { builtInSceneSources } from './scene-sources';

export function projectSources(project: Project): Record<string, string> {
  const custom = Object.values(project.scenes ?? {}).flatMap((definition) => [
    [
      `scenes/${definition.id}/definition.json`,
      JSON.stringify(
        {
          id: definition.id,
          name: definition.name,
          entry: definition.source.entry,
          fields: definition.fields,
          layers: definition.layers,
        },
        null,
        2,
      ),
    ],
    ...Object.entries(definition.source.files).map(([name, text]) => [
      `scenes/${definition.id}/source/${name}`,
      text,
    ]),
  ]);
  return { ...(project.sources ?? builtInSceneSources), ...Object.fromEntries(custom) };
}
