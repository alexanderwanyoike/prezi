import type { Project } from './project';
import { builtInSceneSources } from './scene-sources';

export function projectSources(project: Project): Record<string, string> {
  const { transition } = project;
  const transitionSources: Record<string, string> = transition
    ? {
        'transition/definition.json': JSON.stringify(
          {
            id: transition.id,
            version: transition.version,
            name: transition.name,
            fields: transition.fields,
            properties: transition.properties,
          },
          null,
          2,
        ),
        ...Object.fromEntries(
          Object.entries(transition.source.files).map(([name, text]) => [
            `transition/source/${name}`,
            text,
          ]),
        ),
      }
    : {};
  const { transitionDraft } = project;
  if (transitionDraft) {
    transitionSources['transition-draft/definition.json'] = transitionDraft.metadata;
    Object.entries(transitionDraft.files).forEach(([name, text]) => {
      transitionSources[`transition-draft/source/${name}`] = text;
    });
  }
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
    ...transitionSources,
    ...Object.fromEntries(custom),
    ...Object.fromEntries(drafts),
  };
}
