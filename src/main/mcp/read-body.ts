import type { IncomingMessage } from 'node:http';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function readBody(request: IncomingMessage): Promise<Result<unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let finished = false;
    request.on('data', (chunk: Buffer) => {
      if (finished) return;
      size += chunk.length;
      if (size > 1024 * 1024) {
        finished = true;
        resolve(failure('INVALID_INPUT', 'The MCP request exceeds 1 MiB.'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (finished) return;
      finished = true;
      try {
        const input: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve({ ok: true, value: input });
      } catch {
        resolve(failure('INVALID_INPUT', 'The MCP request must be valid JSON.'));
      }
    });
    request.on('error', () => {
      if (!finished) resolve(failure('IO_ERROR', 'The MCP request was interrupted.'));
      finished = true;
    });
  });
}
