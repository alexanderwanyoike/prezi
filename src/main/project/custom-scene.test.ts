import { expect, it } from 'vitest';
import { ProjectOwner } from './project-owner';

it('installs source and instance properties atomically and restores both through shared history', () => {
  const owner = new ProjectOwner();
  const before = owner.snapshot();
  const slide = before.project.slides[0];
  if (!slide) throw Error('No slide');
  const definition = {
    id: crypto.randomUUID(),
    name: 'A scene',
    source: {
      entry: 'Scene.tsx',
      files: { 'Scene.tsx': 'export default function Scene(){return <div/>;}' },
    },
    code: 'compiled code',
    fields: { headline: { type: 'text' as const, label: 'Headline', default: 'A scene' } },
    layers: [{ id: 'heading', label: 'Heading', property: 'headline' }],
  };
  const request = {
    requestId: 'install-scene',
    expectedRevision: 0,
    label: 'Agent: Create scene',
    slideId: slide.id,
    definition,
    properties: { headline: 'Human editable' },
  };
  expect(owner.installScene(request)).toMatchObject({
    ok: true,
    value: { revision: 1, undoLabel: 'Agent: Create scene' },
  });
  expect(owner.snapshot().project.scenes?.[definition.id]).toEqual(definition);
  expect(owner.snapshot().project.slides[0]?.scene).toEqual({
    definitionId: definition.id,
    properties: { headline: 'Human editable' },
  });
  expect(owner.installScene(request)).toMatchObject({ ok: true, value: { revision: 1 } });
  const installed = owner.snapshot();
  expect(
    owner.edit({
      requestId: 'bad-prop',
      expectedRevision: 1,
      label: 'Bad property',
      operations: [
        {
          type: 'updateSlide',
          slideId: slide.id,
          patch: { scene: { definitionId: definition.id, properties: { headline: 12 } } },
        },
      ],
    }).ok,
  ).toBe(false);
  expect(owner.snapshot()).toEqual(installed);
  expect(
    owner.edit({
      requestId: 'properties',
      expectedRevision: 1,
      label: 'Edit scene properties',
      operations: [
        {
          type: 'updateSceneProperties',
          slideId: slide.id,
          patch: { headline: 'Updated in the inspector' },
        },
      ],
    }),
  ).toMatchObject({ ok: true, value: { revision: 2 } });
  expect(owner.snapshot().project.slides[0]?.scene?.properties).toEqual({
    headline: 'Updated in the inspector',
  });
  owner.undo(2);
  expect(owner.snapshot().project).toEqual(installed.project);
  owner.undo(3);
  expect(owner.snapshot().project).toEqual(before.project);
  owner.redo(4);
  expect(owner.snapshot().project).toEqual(installed.project);
  const working = owner.snapshot();
  expect(
    owner.installScene({
      ...request,
      requestId: 'invalid-layer',
      expectedRevision: working.revision,
      definition: {
        ...definition,
        layers: [{ id: 'bad', label: 'Missing property', property: 'missing' }],
      },
    }).ok,
  ).toBe(false);
  expect(owner.snapshot()).toEqual(working);
});
