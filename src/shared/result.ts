export interface AppError {
  code: 'INVALID_INPUT' | 'CONFLICT' | 'REQUEST_REUSED' | 'NOT_FOUND' | 'IO_ERROR' | 'CANCELLED';
  message: string;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
export function failure(code: AppError['code'], message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
