import { useCallback, useEffect, useRef, useState } from 'react';

export function usePresentationStep(
  slideId: string,
  reveal: number,
  durationMs: number,
  complete: () => void,
) {
  const step = useRef({ slideId, reveal, durationMs, started: false });
  const until = useRef(Infinity);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finished = useRef(complete);
  finished.current = complete;
  const [busy, setBusy] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );
  const begin = useCallback((id: string, nextReveal: number, duration: number): void => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    step.current = { slideId: id, reveal: nextReveal, durationMs: duration, started: false };
    until.current = Infinity;
    setBusy(true);
    setPlaying(false);
    setGeneration((value) => value + 1);
  }, []);
  const ready = useCallback((id: string, currentReveal: number): void => {
    const { current } = step;
    if (current.started || current.slideId !== id || current.reveal !== currentReveal) return;
    current.started = true;
    until.current = performance.now() + current.durationMs;
    setPlaying(true);
    timer.current = setTimeout(() => {
      until.current = 0;
      setBusy(false);
      setPlaying(false);
      finished.current();
    }, current.durationMs);
  }, []);
  const locked = useCallback(() => performance.now() < until.current, []);
  return { busy, playing, generation, begin, ready, locked };
}
