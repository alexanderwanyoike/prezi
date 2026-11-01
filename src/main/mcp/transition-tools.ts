import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { transitionRequestSchema } from '../../shared/transition';
import type { TransitionJobs } from '../transitions/transition-jobs';

export function registerTransitionTools(server: McpServer, jobs: TransitionJobs): void {
  server.registerTool(
    'compile_transition',
    {
      description:
        'Compile a programmable slide transition. Default-export a function taking typed TransitionProps (progress, entering/exiting direction, advance/back navigation, editable props) and returning numeric TransitionStyle. Both directions and roles are sampled in an isolated muted worker; only bounded samples play in the editor. Errors preserve the working transition. Poll read_job/cancel_job with transition: IDs. Accepted source/properties persist with shared Undo. Drafts are retained unless consumeDraft is explicit.',
      inputSchema: transitionRequestSchema.extend({ label: z.string().min(1).max(90) }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => {
      const result = jobs.submit({ ...input, label: `Agent: ${input.label}` });
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: { result },
        isError: !result.ok,
      };
    },
  );
}
