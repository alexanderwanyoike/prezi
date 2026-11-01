import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { previewRequestSchema } from '../../shared/preview';
import type { PreviewJobs } from '../previews/preview-jobs';

export function registerPreviewTools(server: McpServer, jobs: PreviewJobs): void {
  server.registerTool(
    'capture_preview',
    {
      description:
        'Capture any slide at a chosen reveal in an isolated, muted renderer. Leaves human selection, view, playback, revision and Undo untouched. Uses the bounded serial render queue. Retry the same preview: requestId/payload and poll read_job; read_preview returns its JPEG. Stored previews are temporary and bounded.',
      inputSchema: previewRequestSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => {
      const result = jobs.submit(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: { result },
        isError: !result.ok,
      };
    },
  );
  server.registerTool(
    'read_preview',
    {
      description:
        'Read a completed preview JPEG as image content. If a retained job has no image yet, read_job reports progress or failure. Old previews expire from the bounded cache.',
      inputSchema: z.object({ jobId: z.string().min(1).max(100) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ jobId }) => {
      const result = jobs.read(jobId);
      if (!result.ok || !result.value.image)
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      return {
        content: [
          {
            type: 'image' as const,
            mimeType: 'image/jpeg',
            data: result.value.image.dataUrl.slice('data:image/jpeg;base64,'.length),
          },
        ],
        structuredContent: {
          revision: result.value.revision,
          slideId: result.value.slideId,
          width: 960,
          height: 540,
        },
      };
    },
  );
}
