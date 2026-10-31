import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditOperation, ProjectSnapshot } from '../shared/project';
import type { Result } from '../shared/result';

type Action = (snapshot: ProjectSnapshot) => Promise<Result<ProjectSnapshot>>;
export function useProject() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const latest = useRef<ProjectSnapshot | null>(null);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = useCallback((next: ProjectSnapshot): void => {
    if (latest.current && next.revision < latest.current.revision) return;
    latest.current = next;
    setSnapshot(next);
  }, []);
  useEffect(() => {
    const unsubscribe = window.prezi.subscribe(accept);
    void window.prezi.snapshot().then((result) => {
      if (result.ok) accept(result.value);
      else setError(result.error.message);
    });
    return unsubscribe;
  }, [accept]);
  const dispatch = useCallback(
    (action: Action): void => {
      pending.current += 1;
      setBusy(true);
      queue.current = queue.current
        .then(async () => {
          if (!latest.current) return;
          const result = await action(latest.current);
          if (result.ok) {
            accept(result.value);
            setError(null);
          } else if (result.error.code !== 'CANCELLED') setError(result.error.message);
        })
        .catch(() => {
          setError('An unexpected project error occurred. Your current deck is still open.');
        })
        .finally(() => {
          pending.current -= 1;
          setBusy(pending.current > 0);
        });
    },
    [accept],
  );
  function edit(operations: EditOperation[], label: string): void {
    dispatch((current) =>
      window.prezi.edit({
        requestId: crypto.randomUUID(),
        expectedRevision: current.revision,
        label,
        operations,
      }),
    );
  }
  return {
    newProject: () => {
      dispatch(() => window.prezi.newProject());
    },
    open: () => {
      dispatch(() => window.prezi.open());
    },
    save: (saveAs = false) => {
      dispatch(() => window.prezi.save(saveAs));
    },
    snapshot,
    busy,
    error,
    edit,
    undo: () => {
      dispatch((current) => window.prezi.undo(current.revision));
    },
    redo: () => {
      dispatch((current) => window.prezi.redo(current.revision));
    },
  };
}
