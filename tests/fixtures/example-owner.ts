import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { ProjectOwner } from '../../src/main/project/project-owner';
import { writeExampleProject } from './example-project';

export async function exampleOwner(): Promise<ProjectOwner> {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-example-'));
  const owner = new ProjectOwner();
  onTestFinished(async () => {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  });
  const opened = await owner.open(await writeExampleProject(directory), 0);
  if (!opened.ok) throw Error(opened.error.message);
  return owner;
}
