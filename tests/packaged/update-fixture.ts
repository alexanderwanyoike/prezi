import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { byteRange } from '../../src/main/media/byte-range';

export async function updateFeed(directory: string, version: string) {
  const files = new Map([
    ['latest-linux.yml', resolve(directory, 'latest-linux.yml')],
    [
      `Prezi-${version}-linux-x64.AppImage`,
      resolve(directory, `Prezi-${version}-linux-x64.AppImage`),
    ],
  ]);
  const server = createServer((request, response) => {
    const name = new URL(request.url ?? '/', 'http://localhost').pathname.split('/').at(-1) ?? '';
    const path = files.get(name);
    if (!path) {
      response.writeHead(404).end();
      return;
    }
    void stat(path)
      .then((info) => {
        const range = byteRange(request.headers.range ?? null, info.size);
        if (!range.ok) {
          response.writeHead(416).end();
          return;
        }
        const start = range.value?.start ?? 0;
        const end = range.value?.end ?? info.size - 1;
        response.writeHead(range.value ? 206 : 200, {
          'Content-Type': name.endsWith('.yml') ? 'application/yaml' : 'application/octet-stream',
          'Content-Length': end - start + 1,
          'Accept-Ranges': 'bytes',
          ...(range.value
            ? {
                'Content-Range': `bytes ${start.toString()}-${end.toString()}/${info.size.toString()}`,
              }
            : {}),
        });
        if (request.method === 'HEAD') {
          response.end();
          return;
        }
        const stream = createReadStream(path, { start, end, highWaterMark: 256 * 1024 });
        let timer: ReturnType<typeof setTimeout> | undefined;
        stream.on('data', (chunk: string | Buffer) => {
          stream.pause();
          response.write(chunk, () => {
            timer = setTimeout(() => {
              stream.resume();
            }, 5);
          });
        });
        stream.on('end', () => {
          response.end();
        });
        stream.on('error', () => {
          response.destroy();
        });
        response.on('close', () => {
          clearTimeout(timer);
          stream.destroy();
        });
      })
      .catch(() => {
        response.writeHead(500).end();
      });
  });
  await new Promise<void>((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolveReady();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture address');
  return {
    url: `http://127.0.0.1:${address.port.toString()}/feed/`,
    close: () =>
      new Promise<void>((resolveClosed) => {
        server.close(() => {
          resolveClosed();
        });
        server.closeAllConnections();
      }),
  };
}
export function hashFile(path: string): Promise<string> {
  const hash = createHash('sha512');
  const stream = createReadStream(path);
  return new Promise((resolveHash, reject) => {
    stream.on('data', (chunk: string | Buffer) => {
      hash.update(chunk);
    });
    stream.once('error', reject);
    stream.once('end', () => {
      resolveHash(hash.digest('hex'));
    });
  });
}
export async function stopPrivateProfile(profile: string): Promise<void> {
  const argument = `--user-data-dir=${profile}`;
  await Promise.all(
    (await readdir('/proc'))
      .filter((entry) => /^\d+$/.test(entry))
      .map(async (entry) => {
        try {
          const args = (await readFile(`/proc/${entry}/cmdline`, 'utf8')).split('\0');
          if (args.includes(argument) && Number(entry) !== process.pid)
            process.kill(Number(entry), 'SIGTERM');
        } catch {
          // Processes can exit between enumeration and inspection.
        }
      }),
  );
}
