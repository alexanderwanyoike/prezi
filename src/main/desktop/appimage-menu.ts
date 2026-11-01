import { randomUUID } from 'node:crypto';
import { copyFile, link, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

interface AppImageDesktopOptions {
  platform: NodeJS.Platform;
  packaged: boolean;
  appImage?: string | undefined;
  dataHome?: string | undefined;
  home: string;
  icon: string;
}

function desktopString(value: string): string {
  return value.replaceAll('\\', '\\\\');
}

function executable(value: string): string {
  const quoted = value.replace(/[\\"`$]/g, (character) => `\\${character}`);
  return `"${desktopString(quoted).replaceAll('%', '%%')}"`;
}

export async function integrateAppImage(
  options: AppImageDesktopOptions,
): Promise<Result<undefined>> {
  const { appImage } = options;
  if (options.platform !== 'linux' || !options.packaged || !appImage)
    return { ok: true, value: undefined };
  const dataHome =
    options.dataHome && isAbsolute(options.dataHome)
      ? options.dataHome
      : join(options.home, '.local/share');
  if (
    ![appImage, dataHome, options.home, options.icon].every(
      (path) =>
        isAbsolute(path) &&
        !Array.from(path).some((character) => character < ' ' || character === '\u007f'),
    ) ||
    appImage.includes('=')
  )
    return failure(
      'INVALID_INPUT',
      'The AppImage or menu location cannot be used in a desktop launcher.',
    );
  const applications = join(dataHome, 'applications');
  const icon = join(dataHome, 'icons/io.github.alexanderwanyoike.prezi.png');
  const entry = join(applications, 'io.github.alexanderwanyoike.prezi.desktop');
  const temporary = `${entry}.${randomUUID()}.tmp`;
  try {
    const previous = await readFile(entry, 'utf8').catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    });
    if (previous !== null && !previous.split(/\r?\n/).includes('X-Prezi-AppImage-Integration=true'))
      return { ok: true, value: undefined };
    if (!(await stat(appImage)).isFile())
      return failure(
        'INVALID_INPUT',
        'The AppImage file could not be found for the application menu.',
      );
    await mkdir(applications, { recursive: true });
    await mkdir(join(dataHome, 'icons'), { recursive: true });
    await copyFile(options.icon, icon);
    await writeFile(
      temporary,
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Prezi',
        // GLib checks executable existence before expanding literal percent escapes.
        `Exec=env -- ${executable(appImage)}`,
        `Icon=${desktopString(icon)}`,
        'Terminal=false',
        'Categories=Office;Presentation;',
        'StartupWMClass=prezi',
        'X-Prezi-AppImage-Integration=true',
        '',
      ].join('\n'),
      { flag: 'wx', mode: 0o644 },
    );
    if (previous !== null) await rename(temporary, entry);
    else
      await link(temporary, entry).catch((error: unknown) => {
        if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
      });
    return { ok: true, value: undefined };
  } catch {
    return failure(
      'IO_ERROR',
      'Prezi could not add its application-menu shortcut. Check permissions on your user data folder.',
    );
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
