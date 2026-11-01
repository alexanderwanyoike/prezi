import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createProject } from '../../shared/project';
import { ProjectOwner } from './project-owner';
import { writeProject } from './project-files';
import { readArchive } from '../archive/read-archive';

async function largeProject() {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-reference-budget-'));
  const owner = new ProjectOwner();
  const slides = Array.from({ length: 8 }, () => ({
    id: crypto.randomUUID(),
    title: '',
    body: '',
    layout: 'content' as const,
    reveals: [],
  }));
  const draft = () => ({
    definitionId: crypto.randomUUID(),
    baseVersion: null,
    entry: 'Scene.tsx',
    files: { 'Scene.tsx': 'export default()=>null' },
    metadata: ' '.repeat(1000000),
  });
  const project = {
    ...createProject(),
    slides,
    sources: Object.fromEntries(
      Array.from({ length: 4 }, (_, index) => [
        `reference-${index.toString()}.tsx`,
        ' '.repeat(225000),
      ]),
    ),
    drafts: Object.fromEntries(slides.slice(0, 7).map((slide) => [slide.id, draft()])),
  };
  const path = join(directory, 'original.prezi.json');
  expect((await writeProject(path, project)).ok).toBe(true);
  expect((await owner.open(path, 0)).ok).toBe(true);
  return { directory, owner, project, draft };
}

it('counts retained reference source when accepting edits and keeps accepted saves readable', async () => {
  const { directory, owner, project, draft } = await largeProject();
  let extracted: string | undefined;
  try {
    const before = owner.snapshot();
    const slide = project.slides[7];
    if (!slide) throw Error('No slide');
    const result = owner.edit({
      requestId: 'over-reference-budget',
      expectedRevision: before.revision,
      label: 'Update draft',
      operations: [{ type: 'setSceneDraft', slideId: slide.id, draft: draft() }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw Error('Expected content-budget rejection');
    expect(result.error.code).toBe('INVALID_INPUT');
    expect(owner.snapshot()).toEqual(before);
    await ['prezi.json', 'prezi'].reduce<Promise<void>>(
      (previous, extension) =>
        previous.then(async () => {
          const saved = join(directory, `saved.${extension}`);
          expect((await owner.save(saved)).ok).toBe(true);
          const reopened = new ProjectOwner();
          try {
            expect((await reopened.open(saved, 0)).ok).toBe(true);
            expect(reopened.snapshot().project).toEqual(before.project);
            expect(reopened.sourceCatalog().files).toEqual(project.sources);
          } finally {
            await reopened.dispose();
          }
        }),
      Promise.resolve(),
    );
    const archive = await readArchive(join(directory, 'saved.prezi'));
    if (!archive.ok) throw Error(archive.error.message);
    extracted = archive.value.directory;
    expect(archive.value.project.sources).toEqual(project.sources);
  } finally {
    await owner.dispose();
    if (extracted) await rm(extracted, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

it('counts retained reference source before installing a compiled scene', async () => {
  const { directory, owner, project } = await largeProject();
  try {
    const before = owner.snapshot();
    const slide = project.slides[7];
    if (!slide) throw Error('No slide');
    const result = owner.installScene({
      requestId: 'over-reference-scene-budget',
      expectedRevision: before.revision,
      slideId: slide.id,
      label: 'Install scene',
      definition: {
        id: crypto.randomUUID(),
        name: 'Scene',
        fields: {},
        layers: [],
        source: { entry: 'Scene.tsx', files: { 'Scene.tsx': 'export default()=>null' } },
        code: ' '.repeat(600000),
      },
      properties: {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw Error('Expected content-budget rejection');
    expect(result.error.code).toBe('INVALID_INPUT');
    expect(owner.snapshot()).toEqual(before);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects a save that would expand a compact opened project past the reader limit', async () => {
  const { directory, owner, project, draft } = await largeProject();
  try {
    const slide = project.slides[7];
    if (!slide) throw Error('No slide');
    const tail = { ...draft(), metadata: '' };
    const compact = { ...project, drafts: { ...project.drafts, [slide.id]: tail } };
    const remaining = 8 * 1024 * 1024 - 1 - Buffer.byteLength(JSON.stringify(compact));
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(1000000);
    tail.metadata = 'x'.repeat(remaining);
    const path = join(directory, 'compact.prezi.json');
    await writeFile(path, JSON.stringify(compact));
    expect((await owner.open(path, owner.snapshot().revision)).ok).toBe(true);
    const destination = join(directory, 'keep.prezi.json');
    expect((await writeProject(destination, createProject())).ok).toBe(true);
    const previousBytes = await readFile(destination);
    const before = owner.snapshot();
    const result = await owner.save(destination);
    expect(result.ok).toBe(false);
    if (result.ok) throw Error('Expected content-budget rejection');
    expect(result.error.code).toBe('INVALID_INPUT');
    expect(await readFile(destination)).toEqual(previousBytes);
    expect(owner.snapshot()).toEqual(before);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
