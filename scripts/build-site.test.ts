// @vitest-environment jsdom
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { buildSite } from './build-site';

const repository = 'https://github.com/alexanderwanyoike/prezi';
const names = [
  'Prezi-0.1.0-windows-x64-setup.exe',
  'Prezi-0.1.0-macos-arm64.dmg',
  'Prezi-0.1.0-macos-x64.dmg',
  'Prezi-0.1.0-linux-x64.AppImage',
  'SHA256SUMS',
];
const release = {
  tag_name: 'v0.1.0',
  draft: false,
  prerelease: false,
  published_at: '2026-11-01T12:00:00Z',
  assets: names.map((name) => ({
    name,
    size: 150000000,
    browser_download_url: `${repository}/releases/download/v0.1.0/${name}`,
  })),
};

it('builds working native download links and local assets only for a complete published release', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prezi-site-'));
  try {
    const directory = join(root, 'valid');
    expect((await buildSite(release, directory)).ok).toBe(true);
    const html = await readFile(join(directory, 'index.html'), 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(
      Array.from(
        document.querySelectorAll<HTMLAnchorElement>('#downloads a[data-installer]'),
        (link) => link.href,
      ),
    ).toEqual(release.assets.slice(0, 4).map((asset) => asset.browser_download_url));
    expect(document.querySelector('[data-version]')?.textContent).toBe('v0.1.0');
    expect(document.querySelector('a[data-checksums]')?.getAttribute('href')).toBe(
      release.assets[4]?.browser_download_url,
    );
    expect(html).not.toMatch(/__[A-Z_]+__/);
    const images = Array.from(document.querySelectorAll('img'));
    expect(images.length).toBeGreaterThan(0);
    await Promise.all(
      images.map(async (image) => {
        const url = new URL(image.src, 'https://alexanderwanyoike.github.io/prezi/');
        expect(url.pathname.startsWith('/prezi/assets/')).toBe(true);
        expect((await stat(join(directory, url.pathname.slice('/prezi/'.length)))).isFile()).toBe(
          true,
        );
      }),
    );
    await [
      { ...release, draft: true },
      { ...release, prerelease: true },
      { ...release, assets: release.assets.slice(0, 3) },
      { ...release, assets: [...release.assets, release.assets[0]] },
      { ...release, tag_name: 'v0.1.1' },
      {
        ...release,
        assets: release.assets.map((asset) => ({
          ...asset,
          browser_download_url: asset.browser_download_url.replace('github.com', 'example.com'),
        })),
      },
    ].reduce<Promise<void>>(
      (previous, input, index) =>
        previous.then(async () => {
          const output = join(root, `invalid-${index.toString()}`);
          const result = await buildSite(input, output);
          expect(result.ok).toBe(false);
          await expect(stat(join(output, 'index.html'))).rejects.toMatchObject({ code: 'ENOENT' });
        }),
      Promise.resolve(),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
