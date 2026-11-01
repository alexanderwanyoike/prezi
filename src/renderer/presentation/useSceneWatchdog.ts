import { useCallback, useEffect, useRef } from 'react';

export function useSceneWatchdog(
  instance: string,
  ready: boolean,
  failed: boolean,
  failure: (message: string) => void,
): () => void {
  const last = useRef(performance.now());
  const callback = useRef(failure);
  callback.current = failure;
  useEffect(
    () => () => {
      void window.prezi.stopScene(instance);
    },
    [instance],
  );
  useEffect(() => {
    if (failed) void window.prezi.stopScene(instance);
  }, [instance, failed]);
  useEffect(() => {
    last.current = performance.now();
    if (failed) return undefined;
    let started = performance.now();
    let live = true;
    let stopping = false;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        last.current = performance.now();
        started = performance.now();
        return;
      }
      const elapsed = performance.now() - (ready ? last.current : started);
      if (stopping || elapsed < (ready ? 6000 : 10000)) return;
      stopping = true;
      if (live)
        callback.current(
          ready ? 'Scene stopped responding.' : 'Scene did not become ready within 10 seconds.',
        );
    }, 500);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [instance, ready, failed]);
  return useCallback(() => {
    last.current = performance.now();
  }, []);
}
