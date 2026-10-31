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
export type Compilation =
  | { ok: true; value: { code: string } }
  | {
      ok: false;
      error: { code: 'INVALID_INPUT'; message: string; diagnostics: SourceDiagnostic[] };
    };
