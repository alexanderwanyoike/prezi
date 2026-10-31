import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';
import type { UpdateState } from '../../shared/updates';

export interface UpdateBackend {
  automatic: boolean;
  check: () => Promise<Result<string | null>>;
  download: (version: string, progress: (percent: number) => void) => Promise<Result<void>>;
  install: () => Promise<Result<void>>;
}
async function safely<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch {
    return failure('IO_ERROR', 'The update operation could not finish. Please retry.');
  }
}
export function createUpdateService(backend?: UpdateBackend) {
  let state: UpdateState = backend
    ? { stage: 'idle' }
    : { stage: 'disabled', reason: 'Updates are available in installed builds.' };
  let busy = false;
  const listeners = new Set<(state: UpdateState) => void>();
  function publish(next: UpdateState): void {
    state = next;
    listeners.forEach((listener) => {
      listener(structuredClone(state));
    });
  }
  const current = (): Result<UpdateState> => ({ ok: true, value: structuredClone(state) });
  return {
    status: () => structuredClone(state),
    subscribe(listener: (state: UpdateState) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async check(): Promise<Result<UpdateState>> {
      if (!backend) return failure('INVALID_INPUT', 'Updates are available in installed builds.');
      if (busy) return failure('CONFLICT', 'An update operation is already running.');
      if (state.stage === 'ready') return current();
      const previous = state;
      busy = true;
      publish({ stage: 'checking' });
      const result = await safely(backend.check);
      busy = false;
      if (!result.ok) {
        publish(previous);
        return result;
      }
      publish(
        result.value
          ? { stage: 'available', version: result.value, automatic: backend.automatic }
          : { stage: 'current' },
      );
      return current();
    },
    async download(): Promise<Result<UpdateState>> {
      if (!backend || busy || state.stage !== 'available')
        return failure('CONFLICT', 'Choose an available update before downloading.');
      const available = state;
      busy = true;
      publish({ stage: 'downloading', version: available.version, percent: 0 });
      const result = await safely(() =>
        backend.download(available.version, (percent) => {
          if (!Number.isFinite(percent)) return;
          const bounded = Math.round(Math.max(0, Math.min(100, percent)));
          if (state.stage === 'downloading' && state.percent !== bounded)
            publish({ stage: 'downloading', version: available.version, percent: bounded });
        }),
      );
      busy = false;
      if (!result.ok) {
        publish(available);
        return result;
      }
      publish(backend.automatic ? { stage: 'ready', version: available.version } : available);
      return current();
    },
    async install(prepare: () => Promise<Result<() => void>>): Promise<Result<UpdateState>> {
      if (!backend || busy || state.stage !== 'ready')
        return failure('CONFLICT', 'Download and verify the update before restarting.');
      const ready = state;
      busy = true;
      publish({ stage: 'installing', version: ready.version });
      const prepared = await safely(prepare);
      if (!prepared.ok) {
        busy = false;
        publish(ready);
        return prepared;
      }
      const result = await safely(backend.install);
      busy = false;
      if (!result.ok) {
        prepared.value();
        publish(ready);
        return result;
      }
      return current();
    },
  };
}
