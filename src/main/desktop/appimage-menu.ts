import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
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
  const applications = join(dataHome, 'applications');
  const icon = join(dataHome, 'icons/io.github.alexanderwanyoike.prezi.png');
  const entry = join(applications, 'io.github.alexanderwanyoike.prezi.desktop');
  const temporary = `${entry}.${randomUUID()}.tmp`;
  try {
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
        `Exec=env -- "${appImage}"`,
        `Icon=${icon}`,
        'Terminal=false',
        'Categories=AudioVideo;Presentation;',
        'StartupWMClass=prezi',
        'X-Prezi-AppImage-Integration=true',
        '',
      ].join('\n'),
      { flag: 'wx', mode: 0o644 },
    );
    await rename(temporary, entry);
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
