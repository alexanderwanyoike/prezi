import type { Project } from './project';
import { builtInSceneSources } from './scene-sources';

export function projectSources(project: Project): Record<string, string> {
  const custom = Object.values(project.scenes ?? {}).flatMap<readonly [string, string]>(
    (definition) => [
      [
        `scenes/${definition.id}/definition.json`,
        JSON.stringify(
          {
            id: definition.id,
            version: definition.version,
            name: definition.name,
            entry: definition.source.entry,
            fields: definition.fields,
            layers: definition.layers,
          },
          null,
          2,
        ),
      ],
      ...Object.entries(definition.source.files).map<readonly [string, string]>(([name, text]) => [
        `scenes/${definition.id}/source/${name}`,
        text,
      ]),
    ],
  );
  const drafts = Object.entries(project.drafts ?? {}).flatMap<readonly [string, string]>(
    ([slideId, draft]) => [
      [`drafts/${slideId}/definition.json`, draft.metadata],
      ...Object.entries(draft.files).map<readonly [string, string]>(([name, text]) => [
        `drafts/${slideId}/source/${name}`,
        text,
      ]),
    ],
  );
  return {
    ...(project.sources ?? builtInSceneSources),
    ...Object.fromEntries(custom),
    ...Object.fromEntries(drafts),
  };
}
