import type { Result } from '../../shared/result';

interface AppImageDesktopOptions {
  platform: NodeJS.Platform;
  packaged: boolean;
  appImage?: string | undefined;
  dataHome?: string | undefined;
  home: string;
  icon: string;
}

export function integrateAppImage(_options: AppImageDesktopOptions): Promise<Result<undefined>> {
  return Promise.resolve({ ok: true, value: undefined });
}
