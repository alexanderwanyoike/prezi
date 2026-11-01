import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const libraries: Record<string, string> = {};
const notices: string[] = [];
async function collect(folder: string, prefix: string): Promise<void> {
  const entries = await readdir(folder, { withFileTypes: true });
  await entries.reduce<Promise<void>>(
    (previous, entry) =>
      previous.then(async () => {
        const path = join(folder, entry.name);
        const virtual = `${prefix}/${entry.name}`;
        if (entry.isDirectory()) await collect(path, virtual);
        else if (entry.isFile() && (entry.name.endsWith('.d.ts') || entry.name === 'package.json'))
          libraries[virtual] = await readFile(path, 'utf8');
      }),
    Promise.resolve(),
  );
}
await ['typescript', '@types/react', '@types/react-dom', 'csstype', 'remotion'].reduce<
  Promise<void>
>(
  (previous, name) =>
    previous.then(async () => {
      const root = dirname(require.resolve(`${name}/package.json`));
      await collect(root, `/prezi/node_modules/${name}`);
      const files = (await readdir(root)).filter((file) =>
        /^(license|licence|notice)(\.|$)/i.test(file),
      );
      const texts = await Promise.all(files.map((file) => readFile(join(root, file), 'utf8')));
      notices.push(`${name}\n${texts.join('\n')}`);
    }),
  Promise.resolve(),
);
const output = resolve('out/compiler');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'types.json'), JSON.stringify(libraries));
await writeFile(join(output, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n\n'));
process.stdout.write('Prepared offline scene declarations and their licences.\n');
