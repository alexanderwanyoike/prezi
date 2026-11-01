import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Project } from '../../src/shared/project';

export function exampleProject(): Project {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: 'Vibez / how I built it',
    slides: [
      {
        id: crypto.randomUUID(),
        title: 'Vibez / how I built it',
        body: '',
        layout: 'title',
        reveals: [],
      },
      {
        id: crypto.randomUUID(),
        title: 'Workflow',
        body: '',
        layout: 'process',
        reveals: ['Planning', 'Implementation', 'Review', 'Human testing'],
      },
      {
        id: crypto.randomUUID(),
        title: 'Video demonstration',
        body: '',
        layout: 'title',
        reveals: [],
        media: {
          id: crypto.randomUUID(),
          name: 'Playback fixture',
          kind: 'video',
          extension: 'webm',
          loop: true,
          muted: true,
        },
      },
    ],
  };
}

export async function writeExampleProject(directory: string): Promise<string> {
  const project = exampleProject();
  const media = project.slides[2]?.media;
  if (!media) throw Error('Missing fixture media');
  const path = join(directory, 'example.prezi.json');
  await mkdir(`${path}.assets`, { recursive: true });
  await copyFile(
    resolve('tests/fixtures/held-video.webm'),
    join(`${path}.assets`, `${media.id}.webm`),
  );
  await writeFile(path, JSON.stringify(project));
  return path;
}
