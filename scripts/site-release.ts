import { z } from 'zod';
import { failure } from '../src/shared/result';
import type { Result } from '../src/shared/result';

const repository = 'https://github.com/alexanderwanyoike/prezi';
const releaseSchema = z.object({
  tag_name: z.string().regex(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
  draft: z.literal(false),
  prerelease: z.literal(false),
  published_at: z.iso.datetime(),
  assets: z
    .array(
      z.object({
        name: z.string(),
        size: z.number().int().positive(),
        browser_download_url: z.url(),
      }),
    )
    .max(100),
});
const targets = [
  ['WINDOWS', 'windows-x64-setup.exe'],
  ['MAC_ARM', 'macos-arm64.dmg'],
  ['MAC_INTEL', 'macos-x64.dmg'],
  ['LINUX', 'linux-x64.AppImage'],
  ['CHECKSUMS', null],
] as const;

export function renderSite(template: string, input: unknown): Result<string> {
  const parsed = releaseSchema.safeParse(input);
  if (!parsed.success)
    return failure('INVALID_INPUT', 'The site requires a published stable release.');
  const release = parsed.data;
  const version = release.tag_name.slice(1);
  const prefix = `${repository}/releases/download/${release.tag_name}/`;
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(new Date(release.published_at));
  const rendered = targets.reduce<Result<string>>(
    (previous, [key, suffix]) => {
      if (!previous.ok) return previous;
      const name = suffix ? `Prezi-${version}-${suffix}` : 'SHA256SUMS';
      const matches = release.assets.filter((asset) => asset.name === name);
      const asset = matches[0];
      if (matches.length !== 1 || asset?.browser_download_url !== `${prefix}${name}`)
        return failure('INVALID_INPUT', `The published release is missing a valid ${name}.`);
      const size = `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(asset.size / 1024 / 1024)} MiB`;
      return {
        ok: true,
        value: previous.value
          .replaceAll(`__${key}_URL__`, asset.browser_download_url)
          .replaceAll(`__${key}_SIZE__`, size),
      };
    },
    {
      ok: true,
      value: template.replaceAll('__VERSION__', release.tag_name).replaceAll('__DATE__', date),
    },
  );
  if (!rendered.ok) return rendered;
  return /__[A-Z_]+__/.test(rendered.value)
    ? failure('INVALID_INPUT', 'The site contains unresolved release fields.')
    : rendered;
}
