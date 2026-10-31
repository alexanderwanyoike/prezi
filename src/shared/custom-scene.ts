import { z } from 'zod';

export const scenePathSchema = z
  .string()
  .max(160)
  .regex(/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:tsx?|json)$/);
export const sceneSourceSchema = z.object({
  entry: scenePathSchema,
  files: z
    .record(scenePathSchema, z.string().max(250000))
    .refine(
      (files) =>
        Object.keys(files).length <= 32 &&
        Object.values(files).reduce(
          (total, file) => total + new TextEncoder().encode(file).length,
          0,
        ) <= 1000000,
      'A scene may contain at most 32 files and 1 MB of source.',
    ),
});
export type SceneSource = z.infer<typeof sceneSourceSchema>;
export interface SourceDiagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
}
export const compilationSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    value: z.object({
      code: z.string().max(2 * 1024 * 1024),
      resources: z
        .object({
          peakMemoryBytes: z.number(),
          cpuMicros: z.number(),
          memoryLimitBytes: z.number().nullable(),
          swapLimitBytes: z.number().nullable(),
        })
        .optional(),
    }),
  }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.literal('INVALID_INPUT'),
      message: z.string(),
      diagnostics: z
        .array(
          z.object({ file: z.string(), line: z.number(), column: z.number(), message: z.string() }),
        )
        .max(50),
    }),
  }),
]);
export type Compilation = z.infer<typeof compilationSchema>;
