import { expect } from '@playwright/test';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { z } from 'zod';

export async function connectDesktopMcp(profile: string): Promise<Client> {
  const path = join(profile, 'mcp-connection.json');
  await expect
    .poll(() =>
      access(path)
        .then(() => true)
        .catch(() => false),
    )
    .toBe(true);
  const input: unknown = JSON.parse(await readFile(path, 'utf8'));
  const connection = z.object({ url: z.url(), token: z.string() }).parse(input);
  const client = new Client({ name: 'prezi-scene-verification', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(connection.url), {
      requestInit: { headers: { Authorization: `Bearer ${connection.token}` } },
    }),
  );
  return client;
}
