import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function archiveResources(): Promise<{ name: string; path: string }[]> {
  const manrope = fileURLToPath(import.meta.resolve('@fontsource-variable/manrope/LICENSE'));
  const plex = fileURLToPath(import.meta.resolve('@fontsource/ibm-plex-mono/LICENSE'));
  const groups = await Promise.all(
    [
      { name: 'manrope', license: manrope, style: 'index.css', filter: /-wght-normal\.woff2$/ },
      { name: 'ibm-plex-mono', license: plex, style: '400.css', filter: /-400-normal\.woff2$/ },
    ].map(async ({ name, license, style, filter }) => {
      const root = dirname(license);
      const names = (await readdir(join(root, 'files'))).filter((file) => filter.test(file)).sort();
      return [
        { name: `fonts/${name}/LICENSE`, path: license },
        { name: `fonts/${name}/index.css`, path: join(root, style) },
        ...names.map((file) => ({
          name: `fonts/${name}/files/${file}`,
          path: join(root, 'files', file),
        })),
      ];
    }),
  );
  return groups.flat();
}
