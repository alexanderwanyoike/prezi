import { useCallback, useEffect, useRef, useState } from 'react';
import { editorHistoryTarget } from './editor-history-target';
import type { EditOperation, ProjectSnapshot } from '../shared/project';
import type { Result } from '../shared/result';

type Action = (snapshot: ProjectSnapshot) => Promise<Result<ProjectSnapshot>>;
export function useProject() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const latest = useRef<ProjectSnapshot | null>(null);
  const queue = useRef(Promise.resolve());
  const history = useRef<{ target: string; id: string; at: number } | null>(null);
  useEffect(() => {
    const reset = (): void => {
      history.current = null;
    };
    window.addEventListener('focusin', reset);
    return () => {
      window.removeEventListener('focusin', reset);
    };
  }, []);
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
    (action: Action, keepGroup = false): void => {
      if (!keepGroup) history.current = null;
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
    const target = editorHistoryTarget(operations, label);
    const at = performance.now();
    if (!target) history.current = null;
    else if (history.current?.target === target && at - history.current.at < 500)
      history.current.at = at;
    else history.current = { target, at, id: crypto.randomUUID() };
    const group = history.current?.id;
    dispatch(
      (current) =>
        window.prezi.edit(
          {
            requestId: crypto.randomUUID(),
            expectedRevision: current.revision,
            label,
            operations,
          },
          group,
        ),
      true,
    );
  }
  return {
    flush: () => queue.current,
    replaceMedia: (id: string) => {
      dispatch(() => window.prezi.replaceMedia(id));
    },
    replaceFont: (id: string) => {
      dispatch(() => window.prezi.replaceFont(id));
    },
    importFont: () => {
      dispatch(() => window.prezi.importFont());
    },
    importMedia: (slideId: string) => {
      dispatch(() => window.prezi.importMedia(slideId));
    },
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
