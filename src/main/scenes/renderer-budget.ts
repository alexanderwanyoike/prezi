import type { Result } from '../../shared/result';
import { failure } from '../../shared/result';

export interface RendererBoundary {
  unit: string | null;
  cgroup: string | null;
  memoryLimitBytes: number | null;
  swapLimitBytes: number | null;
}
export async function bindRendererBudget(_pid: number): Promise<Result<RendererBoundary>> {
  return Promise.resolve(failure('IO_ERROR', 'The renderer resource boundary is unavailable.'));
}
