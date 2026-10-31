import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { SceneJobs } from '../source/scene-jobs';
import type { PreviewJobs } from '../previews/preview-jobs';
import { sceneJobRequestSchema } from '../../shared/scene-jobs';
import type { Result } from '../../shared/result';

function respond(result: Result<unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }],
    structuredContent: { result },
    isError: !result.ok,
  };
}
export function registerSceneTools(
  server: McpServer,
  jobs: SceneJobs,
  previews?: PreviewJobs,
): void {
  server.registerTool(
    'compile_scene',
    {
      description:
        'Compile a custom React/Remotion scene with declared editable fields and layers. The serial job validates it in an isolated renderer before one revision-guarded Undo action replaces the working scene. Read read_job until complete; errors preserve working content. Retry the same requestId/payload.',
      inputSchema: sceneJobRequestSchema.extend({ label: z.string().min(1).max(90) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => respond(jobs.submit({ ...input, label: `Agent: ${input.label}` })),
  );
  server.registerTool(
    'read_job',
    {
      description:
        'Read a bounded scene or preview job status, diagnostics and compilation resource measurements. Scene jobs report accepted revisions; previews report captured revisions.',
      inputSchema: z.object({ jobId: z.string().min(1).max(100) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) =>
      respond(
        input.jobId.startsWith('preview:') && previews
          ? previews.read(input.jobId)
          : jobs.read(input.jobId),
      ),
  );
  server.registerTool(
    'cancel_job',
    {
      description:
        'Cancel queued or running scene work. Accepted changes remain in shared Undo history.',
      inputSchema: z.object({ jobId: z.string().min(1).max(100) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      respond(
        input.jobId.startsWith('preview:') && previews
          ? previews.cancel(input.jobId)
          : jobs.cancel(input.jobId),
      ),
  );
}
