import { z } from 'zod';

export const mcpStatusSchema = z.union([
  z.object({ ok: z.literal(true), value: z.object({ url: z.url() }) }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.enum([
        'INVALID_INPUT',
        'CONFLICT',
        'REQUEST_REUSED',
        'NOT_FOUND',
        'IO_ERROR',
        'CANCELLED',
      ]),
      message: z.string(),
    }),
  }),
]);
