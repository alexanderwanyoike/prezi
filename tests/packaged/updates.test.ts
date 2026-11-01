import { _electron as electron, chromium, expect, test } from '@playwright/test';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Browser } from '@playwright/test';
import semver from 'semver';
import { z } from 'zod';
import { updateFeed, hashFile, stopPrivateProfile } from './update-fixture';

// GitHub discovery is fixture data; metadata download, checksum, replacement and relaunch are real.
test('downloads a verified AppImage and reopens the saved deck in the new version', async () => {
  test.setTimeout(120000);
  test.skip(process.platform !== 'linux', 'The native AppImage handoff is Linux-specific.');
  const profile = test.info().outputPath('profile');
  const install = test.info().outputPath('Prezi.AppImage');
  const metadataInput: unknown = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const metadata = z.object({ version: z.string() }).parse(metadataInput);
  const nextVersion = process.env.PREZI_UPDATE_VERSION ?? semver.inc(metadata.version, 'patch');
  if (!nextVersion) throw new Error('Missing update fixture version');
  const fileName = `Prezi-${nextVersion}-linux-x64.AppImage`;

  const baseline = resolve(
    process.env.PREZI_UPDATE_BASELINE ??
      `.scratch/update-fixtures/Prezi-${metadata.version}-linux-x64.AppImage`,
  );
  const next = resolve(process.env.PREZI_UPDATE_NEXT ?? '.scratch/update-fixtures/next');
  await mkdir(profile, { recursive: true });
  await copyFile(baseline, install);
  const feed = await updateFeed(next, nextVersion);
  const resource = resolve('release/linux-unpacked/resources/app-update.yml');
  const originalConfig = await readFile(resource, 'utf8');
  await writeFile(
    resource,
    `provider: generic\nurl: ${feed.url}\nupdaterCacheDirName: prezi-update-verification\nuseMultipleRangeRequest: false\n`,
  );
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
    PREZI_MCP_PORT: '0',
    APPIMAGE: install,
    APPIMAGE_EXTRACT_AND_RUN: '1',
    XDG_CONFIG_HOME: test.info().outputPath('xdg-config'),
    XDG_DATA_HOME: test.info().outputPath('xdg-data'),
    XDG_CACHE_HOME: test.info().outputPath('xdg-cache'),
  };
  const desktop = await electron.launch({
    executablePath: resolve('release/linux-unpacked/prezi'),
    args: ['--mute-audio', `--user-data-dir=${profile}`],
    env,
  });
  const launchedProcess = desktop.process();
  const lifecycle = { closed: false, windowClosed: false };
  desktop.on('close', () => {
    lifecycle.closed = true;
  });
  let relaunched: Browser | undefined;
  try {
    const saved = test.info().outputPath('deck kept through update.prezi');
    await desktop.evaluate(
      ({ dialog }, input) => {
        Object.assign(dialog, {
          showSaveDialog: () => Promise.resolve({ canceled: false, filePath: input.saved }),
          showMessageBox: () => Promise.resolve({ response: 0, checkboxChecked: false }),
        });
        const upstream = fetch;
        Object.assign(globalThis, {
          fetch: (url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) => {
            if (
              typeof url === 'string' &&
              url.includes('api.github.com/repos/alexanderwanyoike/prezi/releases/latest')
            )
              return Promise.resolve(Response.json(input.release));
            return upstream(url, options);
          },
        });
      },
      {
        saved,
        release: {
          tag_name: `v${nextVersion}`,
          draft: false,
          prerelease: false,
          assets: [{ name: fileName }, { name: 'latest-linux.yml' }],
        },
      },
    );
    const page = await desktop.firstWindow();
    page.on('close', () => {
      lifecycle.windowClosed = true;
    });
    await page
      .getByRole('textbox', { name: 'Canvas heading', exact: true })
      .fill('Kept through a real update');
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Application updates…', exact: true }).click();
    await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
    await page.getByRole('button', { name: `Download ${nextVersion}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Restart to update', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await page.screenshot({ path: test.info().outputPath('installed-update-ready.png') });
    const originalPort = await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8');
    // Self-relaunch can keep the process-close event pending after its window has closed.
    const closed = page.waitForEvent('close');
    await page
      .getByRole('button', { name: 'Restart to update', exact: true })
      .click()
      .catch(() => undefined);
    await closed;
    let port = '';
    await expect
      .poll(
        async () => {
          try {
            const active = await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8');
            if (active === originalPort) return false;
            [port = ''] = active.split('\n');
            return (
              await fetch(`http://127.0.0.1:${port}/json/version`, {
                signal: AbortSignal.timeout(500),
              })
            ).ok;
          } catch {
            return false;
          }
        },
        { timeout: 30000 },
      )
      .toBe(true);
    relaunched = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = relaunched.contexts()[0];
    if (!context) throw new Error('Missing relaunched browser context');
    const resumed = context.pages()[0] ?? (await context.waitForEvent('page'));
    await expect(resumed.getByLabel('Heading', { exact: true })).toHaveValue(
      'Kept through a real update',
    );
    expect(await resumed.evaluate(() => window.prezi.updateStatus())).toMatchObject({
      ok: true,
      value: { installedVersion: nextVersion },
    });
    expect(await hashFile(install)).toBe(await hashFile(resolve(next, fileName)));
    await resumed.screenshot({ path: test.info().outputPath('installed-after-update.png') });
    await resumed.evaluate(() => window.prezi.close()).catch(() => undefined);
  } finally {
    await relaunched?.close().catch(() => undefined);
    await stopPrivateProfile(profile);
    if (launchedProcess.exitCode === null) launchedProcess.kill('SIGTERM');
    launchedProcess.stdin?.destroy();
    launchedProcess.stdout?.destroy();
    launchedProcess.stderr?.destroy();
    await feed.close();
    await writeFile(resource, originalConfig);
    if (!lifecycle.closed && !lifecycle.windowClosed) await desktop.close();
  }
});
