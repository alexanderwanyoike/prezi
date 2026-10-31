import { open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { projectSchema } from '../../shared/project';
import type { Project } from '../../shared/project';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function writeProject(path: string, project: Project): Promise<Result<void>> {
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(`${JSON.stringify(project, null, 2)}\n`, 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
    if (process.platform === 'linux') {
      const directory = await open(dirname(path), 'r');
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    }
    return { ok: true, value: undefined };
  } catch (error) {
    return failure(
      'IO_ERROR',
      `Could not save the presentation: ${error instanceof Error ? error.message : 'unknown file error'}`,
    );
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

export async function readProject(path: string): Promise<Result<Project>> {
  try {
    const metadata = await stat(path);
    if (metadata.size > 8 * 1024 * 1024)
      return failure('INVALID_INPUT', 'Project files must be smaller than 8 MiB.');
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    const validated = projectSchema.safeParse(parsed);
    if (!validated.success)
      return failure('INVALID_INPUT', 'This is not a supported version 1 Prezi project.');
    if (
      new Set(validated.data.slides.map((slide) => slide.id)).size !== validated.data.slides.length
    )
      return failure('INVALID_INPUT', 'Slide IDs must be unique.');
    return { ok: true, value: validated.data };
  } catch (error) {
    return failure(
      'IO_ERROR',
      `Could not open the presentation: ${error instanceof Error ? error.message : 'unknown file error'}`,
    );
  }
}
