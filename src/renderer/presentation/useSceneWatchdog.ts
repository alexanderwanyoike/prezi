import { useCallback, useEffect, useRef } from 'react';

export function useSceneWatchdog(
  instance: string,
  prepared: boolean,
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
    if (!prepared || failed) return undefined;
    let live = true;
    let stopping = false;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        last.current = performance.now();
        return;
      }
      if (stopping || performance.now() - last.current < 6000) return;
      stopping = true;
      if (live) callback.current('Scene stopped responding.');
    }, 500);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [instance, prepared, failed]);
  return useCallback(() => {
    last.current = performance.now();
  }, []);
}
