import { mkdir, open, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fontSchema } from '../../shared/fonts';
import type { FontCredit, ProjectFont } from '../../shared/fonts';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export async function importFontFile(
  path: string,
  root: string,
  credit: FontCredit,
): Promise<Result<{ font: ProjectFont; path: string }>> {
  let target: string | undefined;
  let accepted = false;
  try {
    const input = await open(path, 'r');
    try {
      const info = await input.stat();
      if (!info.isFile() || info.size < 12 || info.size > 16 * 1024 * 1024)
        return failure('INVALID_INPUT', 'Choose a font between 12 bytes and 16 MiB.');
      const header = Buffer.alloc(48);
      const { bytesRead } = await input.read(header, 0, 48, 0);
      const formats: Record<string, ProjectFont['extension']> = {
        OTTO: 'otf',
        wOFF: 'woff',
        wOF2: 'woff2',
        true: 'ttf',
        '00010000': 'ttf',
      };
      const extension =
        formats[header.toString('ascii', 0, 4)] ?? formats[header.toString('hex', 0, 4)];
      if (
        (extension === 'woff' || extension === 'woff2') &&
        (bytesRead < (extension === 'woff2' ? 48 : 44) ||
          header.readUInt32BE(16) > 64 * 1024 * 1024 ||
          header.readUInt32BE(16) < 12)
      )
        return failure(
          'INVALID_INPUT',
          'Compressed fonts must declare a decoded size within 64 MiB.',
        );
      const parsed = fontSchema.safeParse({
        ...credit,
        id: crypto.randomUUID(),
        name: basename(path),
        extension,
      });
      if (!parsed.success)
        return failure('INVALID_INPUT', 'Choose a valid TTF, OTF, WOFF or WOFF2 font.');
      await mkdir(root, { recursive: true });
      target = join(root, `${parsed.data.id}.${parsed.data.extension}`);
      const output = await open(target, 'wx', 0o600);
      try {
        const buffer = Buffer.alloc(65536);
        let position = 0;
        const copy = async (): Promise<void> => {
          const { bytesRead } = await input.read(buffer, 0, buffer.length, position);
          if (!bytesRead) return;
          position += bytesRead;
          if (position > 16 * 1024 * 1024) throw Error('The font grew beyond its import budget.');
          await output.writeFile(buffer.subarray(0, bytesRead));
          await copy();
        };
        await copy();
      } finally {
        await output.close();
      }
      accepted = true;
      return { ok: true, value: { font: parsed.data, path: target } };
    } finally {
      await input.close();
    }
  } catch {
    return failure('IO_ERROR', 'Could not import the local font. The presentation is unchanged.');
  } finally {
    if (target && !accepted) await rm(target, { force: true }).catch(() => undefined);
  }
}
