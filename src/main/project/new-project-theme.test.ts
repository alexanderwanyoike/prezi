import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { presentationTheme } from '../../shared/presentation-theme';
import { createProject } from '../../shared/project';
import { writeProject } from './project-files';
import { ProjectOwner } from './project-owner';

it('starts and resets with a neutral theme while retaining a saved custom palette', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-neutral-'));
  const owner = new ProjectOwner();
  const reopened = new ProjectOwner();
  try {
    const initial = owner.snapshot().project.theme;
    expect(initial).toMatchObject({ background: '#ffffff', foreground: '#171717' });
    if (!initial) throw Error('Missing new-project theme');
    (['background', 'foreground', 'muted', 'accent', 'surface', 'border'] as const).forEach(
      (key) => {
        expect(initial[key]).toMatch(/^#([a-f0-9]{2})\1\1$/i);
      },
    );
    expect(
      owner.edit({
        requestId: 'custom-colour',
        expectedRevision: 0,
        label: 'Choose slide colours',
        operations: [{ type: 'setTheme', patch: { background: '#203040', accent: '#f04b24' } }],
      }).ok,
    ).toBe(true);
    const custom = owner.snapshot().project.theme;
    const path = join(directory, 'custom.prezi');
    expect((await owner.save(path)).ok).toBe(true);
    expect((await reopened.open(path, 0)).ok).toBe(true);
    expect(reopened.snapshot().project.theme).toEqual(custom);
    expect((await owner.reset(owner.snapshot().revision)).ok).toBe(true);
    expect(owner.snapshot().project.theme).toEqual(initial);
  } finally {
    await owner.dispose();
    await reopened.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('retains the original rendering of saved projects that predate explicit themes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-legacy-theme-'));
  const owner = new ProjectOwner();
  try {
    const legacy = createProject();
    delete legacy.theme;
    const path = join(directory, 'legacy.prezi.json');
    expect((await writeProject(path, legacy)).ok).toBe(true);
    expect((await owner.open(path, 0)).ok).toBe(true);
    expect(owner.snapshot().project.theme).toBeUndefined();
    expect(presentationTheme(owner.snapshot().project.theme)).toMatchObject({
      background: '#101513',
      accent: '#9bbb9f',
    });
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
