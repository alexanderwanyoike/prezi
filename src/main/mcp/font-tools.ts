import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isAbsolute } from 'node:path';
import { fontCreditSchema } from '../../shared/fonts';
import type { ProjectOwner } from '../project/project-owner';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

function response(result: Result<unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }],
    structuredContent: { result },
    isError: !result.ok,
  };
}
export function registerFontTools(server: McpServer, owner: ProjectOwner): void {
  server.registerTool(
    'read_font',
    {
      description:
        'Read one registered font and its retained provenance and licence notice, bounded to 65536 notice characters.',
      inputSchema: z.object({ fontId: z.uuid() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ fontId }) => {
      const font = owner.snapshot().project.fonts?.find((item) => item.id === fontId);
      return response(
        font
          ? { ok: true, value: font }
          : failure('NOT_FOUND', 'The font is not registered in this project.'),
      );
    },
  );
  server.registerTool(
    'import_font',
    {
      description:
        'Copy a local TTF/OTF/WOFF/WOFF2 font into the shared project with optional supplied provenance and licence notice. Requires the current revision and retry-safe requestId. Select the returned font ID with setTheme in a separate edit batch.',
      inputSchema: z.object({
        requestId: z.string().min(1).max(100),
        expectedRevision: z.number().int().nonnegative(),
        path: z.string().min(1).max(4096).refine(isAbsolute),
        credit: fontCreditSchema.optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await owner.importFont(
        input.path,
        input.expectedRevision,
        input.requestId,
        input.credit,
      );
      return response(
        result.ok
          ? {
              ok: true,
              value: { revision: result.value.revision, fonts: result.value.project.fonts ?? [] },
            }
          : result,
      );
    },
  );
}
