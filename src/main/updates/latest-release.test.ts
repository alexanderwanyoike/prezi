import { expect, test } from 'vitest';
import { latestRelease } from './latest-release';

test('offers only newer complete stable releases for this platform and handles an empty release feed', async () => {
  const release = {
    tag_name: 'v0.2.0',
    draft: false,
    prerelease: false,
    assets: [{ name: 'Prezi-0.2.0-linux-x64.AppImage' }, { name: 'latest-linux.yml' }],
  };
  const request: typeof fetch = () => Promise.resolve(Response.json(release));
  expect(await latestRelease(request, '0.1.0', 'linux', 'x64')).toEqual({
    ok: true,
    value: '0.2.0',
  });
  expect(await latestRelease(request, '0.2.0', 'linux', 'x64')).toEqual({ ok: true, value: null });
  expect((await latestRelease(request, '0.1.0', 'win32', 'x64')).ok).toBe(false);
  expect(
    await latestRelease(
      () => Promise.resolve(new Response(null, { status: 404 })),
      '0.1.0',
      'linux',
      'x64',
    ),
  ).toEqual({ ok: true, value: null });
  expect(
    (
      await latestRelease(
        () => Promise.resolve(Response.json({ ...release, prerelease: true })),
        '0.1.0',
        'linux',
        'x64',
      )
    ).ok,
  ).toBe(false);
});
