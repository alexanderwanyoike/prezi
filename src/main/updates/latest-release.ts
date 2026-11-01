import semver from 'semver';
import { z } from 'zod';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export const RELEASES_URL = 'https://github.com/alexanderwanyoike/prezi/releases';
export function releaseAssetName(
  version: string,
  platform: NodeJS.Platform,
  arch: string,
): string | null {
  if (platform === 'linux') return `Prezi-${version}-linux-${arch}.AppImage`;
  if (platform === 'win32') return `Prezi-${version}-windows-${arch}-setup.exe`;
  if (platform === 'darwin') return `Prezi-${version}-macos-${arch}.dmg`;
  return null;
}
const releaseSchema = z.object({
  tag_name: z.string().regex(/^v\d+\.\d+\.\d+$/),
  draft: z.literal(false),
  prerelease: z.literal(false),
  assets: z.array(z.object({ name: z.string() })).max(1000),
});
export async function latestRelease(
  request: typeof fetch,
  current: string,
  platform: NodeJS.Platform,
  arch: string,
): Promise<Result<string | null>> {
  try {
    const response = await request(
      'https://api.github.com/repos/alexanderwanyoike/prezi/releases/latest',
      {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': `Prezi/${current}` },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.status === 404) return { ok: true, value: null };
    if (!response.ok)
      return failure('IO_ERROR', 'Could not check releases. Check your connection and retry.');
    const input: unknown = await response.json();
    const release = releaseSchema.safeParse(input);
    if (!release.success) return failure('IO_ERROR', 'The latest release metadata is invalid.');
    const version = release.data.tag_name.slice(1);
    if (!semver.valid(current) || !semver.valid(version))
      return failure('INVALID_INPUT', 'The application version is invalid.');
    if (!semver.gt(version, current)) return { ok: true, value: null };
    const installer = releaseAssetName(version, platform, arch);
    const manifest = platform === 'linux' ? 'latest-linux.yml' : 'latest.yml';
    const names = release.data.assets.map((asset) => asset.name);
    if (
      !installer ||
      !names.includes(installer) ||
      (platform !== 'darwin' && !names.includes(manifest))
    )
      return failure(
        'NOT_FOUND',
        'The latest release is not ready for this platform. Please retry later.',
      );
    return { ok: true, value: version };
  } catch {
    return failure('IO_ERROR', 'Could not check releases. Check your connection and retry.');
  }
}
