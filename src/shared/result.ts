import { z } from 'zod';

export const errorCodes = [
  'INVALID_INPUT',
  'CONFLICT',
  'REQUEST_REUSED',
  'NOT_FOUND',
  'IO_ERROR',
  'CANCELLED',
] as const;
export const appErrorSchema = z.object({ code: z.enum(errorCodes), message: z.string() });
export type AppError = z.infer<typeof appErrorSchema>;
export function resultSchema<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value }),
    z.object({ ok: z.literal(false), error: appErrorSchema }),
  ]);
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
export function failure(code: AppError['code'], message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
