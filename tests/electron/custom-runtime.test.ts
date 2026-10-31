import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('runs editable Remotion code in a bounded renderer without the desktop bridge', async () => {
  const desktop = await electron.launch({
    args: [resolve('.'), '--mute-audio', `--user-data-dir=${test.info().outputPath('profile')}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      PREZI_MCP_PORT: '0',
    },
  });
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
    const instance = crypto.randomUUID();
    const prepared = await page.evaluate(async (id) => {
      const frame = document.createElement('iframe');
      frame.title = 'Custom scene';
      frame.src = `prezi-scene://${id}/index.html`;
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      Object.assign(frame.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '1920px',
        height: '1080px',
        transform: 'scale(0.5)',
        transformOrigin: 'top left',
        zIndex: '1000',
      });
      const ready = new Promise<void>((done) => {
        frame.onload = () => {
          done();
        };
      });
      document.body.append(frame);
      await ready;
      return window.prezi.prepareScene(id);
    }, instance);
    expect(prepared.ok).toBe(true);
    const source = `import {AbsoluteFill,useCurrentFrame} from 'remotion'; import {jsx,jsxs} from 'react/jsx-runtime'; import {Text,Layer} from 'prezi'; export default function Scene(){return jsxs(AbsoluteFill,{style:{background:'#101513',color:'#edf2ec'},children:[jsx(Layer,{id:'heading',style:{padding:128,fontSize:80},children:jsx(Text,{property:'headline'})}),jsx('div',{id:'frame',children:useCurrentFrame()})]});}`;
    await page.evaluate(
      ({ code, id }) => {
        document
          .querySelector('iframe')
          ?.contentWindow?.postMessage(
            {
              type: 'prezi:load',
              code,
              definition: {
                id,
                name: 'Editable scene',
                fields: { headline: { type: 'text', label: 'Heading', default: 'Hello' } },
                layers: [{ id: 'heading', label: 'Heading', property: 'headline' }],
              },
              state: {
                title: 'Scene',
                body: '',
                reveal: 0,
                properties: { headline: 'An isolated scene' },
                media: null,
                editing: true,
                pending: false,
                active: true,
                autoplay: false,
                selectedLayer: null,
              },
            },
            '*',
          );
      },
      { code: source, id: instance },
    );
    const child = page.frameLocator('iframe');
    await expect(child.getByRole('textbox', { name: 'Canvas heading', exact: true })).toHaveText(
      'An isolated scene',
    );
    await expect(child.locator('#frame')).toHaveText('11');
    const isolated = await desktop.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw Error('No editor');
      return window.webContents.mainFrame.framesInSubtree.map((frame) => ({
        url: frame.url,
        pid: frame.osProcessId,
      }));
    });
    expect(isolated[1]?.pid).not.toBe(isolated[0]?.pid);
    expect(await child.locator('body').evaluate(() => typeof window.prezi)).toBe('undefined');
  } finally {
    await desktop.close();
  }
});
