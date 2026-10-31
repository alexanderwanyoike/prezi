import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import config from '../../electron.vite.config';

test('loads the editor through the Vite development server with a content security policy', async () => {
  if (!config.renderer) throw new Error('The renderer configuration is missing');
  const server = await createServer({
    ...config.renderer,
    configFile: false,
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('The development server has no local URL');
  const desktop = await electron.launch({
    args: [resolve('.'), `--user-data-dir=${test.info().outputPath('profile')}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      ELECTRON_RENDERER_URL: url,
    },
  });
  try {
    const page = await desktop.firstWindow();
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await expect(page.getByRole('heading', { name: 'Your presentation desk' })).toBeVisible({
      timeout: 4000,
    });
    expect(errors).toEqual([]);
    expect(
      await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),
    ).toContain("script-src 'self'");
  } finally {
    await desktop.close();
    await server.close();
  }
});
