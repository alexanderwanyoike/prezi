import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import {
  localhostHostValidation,
  localhostOriginValidation,
  NodeStreamableHTTPServerTransport,
} from '@modelcontextprotocol/node';
import { z } from 'zod';
import type { SceneJobs } from '../source/scene-jobs';
import type { WorkspaceOwner } from './workspace-owner';
import type { ProjectOwner } from '../project/project-owner';
import { createToolServer } from './tools';
import { readBody } from './read-body';
import { readToken, writeConnection } from './credentials';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export interface McpConnection {
  url: string;
  token: string;
  close: () => Promise<void>;
}
export async function startMcp(
  owner: ProjectOwner,
  directory: string,
  workspace: WorkspaceOwner,
  jobs?: SceneJobs,
): Promise<Result<McpConnection>> {
  const credentials = await readToken(directory);
  if (!credentials.ok) return credentials;
  const token = credentials.value;
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  const server = createServer((request, response) => {
    if (!validateHost(request, response) || !validateOrigin(request, response)) return;
    const authorization = Buffer.from(request.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
      response.writeHead(401, { 'WWW-Authenticate': 'Bearer' }).end();
      return;
    }
    if (request.url !== '/mcp') {
      response.writeHead(404).end();
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST' }).end();
      return;
    }
    if (Number(request.headers['content-length']) > 1024 * 1024) {
      response.writeHead(413).end();
      return;
    }
    void readBody(request)
      .then(async (body) => {
        if (!body.ok) {
          response.writeHead(400).end(body.error.message);
          return;
        }
        const mcp = createToolServer(owner, workspace, jobs);
        const transport = new NodeStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        response.on('close', () => {
          void mcp.close();
        });
        await mcp.connect(transport);
        await transport.handleRequest(request, response, body.value);
      })
      .catch(() => {
        if (!response.headersSent) response.writeHead(500).end('The MCP request could not finish.');
        else response.end();
      });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 1000;
  server.maxHeadersCount = 32;
  const port = z.coerce
    .number()
    .int()
    .min(0)
    .max(65535)
    .safeParse(process.env.PREZI_MCP_PORT ?? 39471);
  if (!port.success) return failure('INVALID_INPUT', 'PREZI_MCP_PORT must be a valid port.');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port.data, '127.0.0.1', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing MCP address');
    const url = `http://127.0.0.1:${address.port.toString()}/mcp`;
    await writeConnection(directory, url, token);
    return {
      ok: true,
      value: {
        url,
        token,
        close: () =>
          new Promise<void>((resolve) => {
            server.close(() => {
              resolve();
            });
            server.closeAllConnections();
          }),
      },
    };
  } catch {
    server.close();
    return failure(
      'IO_ERROR',
      'MCP could not start. Check the port setting; the editor remains available.',
    );
  }
}
