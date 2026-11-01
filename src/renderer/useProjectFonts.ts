import { useEffect, useRef, useState } from 'react';
import type { ProjectFont } from '../shared/fonts';
import type { PresentationTheme } from '../shared/presentation-theme';
import type { Result } from '../shared/result';
import { loadProjectFont } from './load-project-font';

export function useProjectFonts(
  fonts: ProjectFont[] | undefined,
  theme: PresentationTheme | undefined,
): { ready: boolean; error: string | null } {
  const selected = (fonts ?? []).filter(
    (font) => font.id === theme?.bodyFont || font.id === theme?.monoFont,
  );
  const key = selected
    .map((font) => font.id)
    .sort()
    .join(',');
  const latest = useRef(selected);
  latest.current = selected;
  const [status, setStatus] = useState<{ key: string; result: Result<void> }>({
    key: '',
    result: { ok: true, value: undefined },
  });
  useEffect(() => {
    let cancelled = false;
    const live = (): boolean => !cancelled;
    const faces: FontFace[] = [];
    const loaded = latest.current.reduce<Promise<Result<void>>>(
      (previous, font) =>
        previous.then(async (result) => {
          if (!result.ok || !live()) return result;
          const next = await loadProjectFont(font);
          if (!next.ok) return next;
          faces.push(next.value);
          if (live()) document.fonts.add(next.value);
          return { ok: true, value: undefined };
        }),
      Promise.resolve({ ok: true, value: undefined }),
    );
    void loaded.then((result) => {
      if (live()) setStatus({ key, result });
    });
    return () => {
      cancelled = true;
      faces.forEach((face) => {
        document.fonts.delete(face);
      });
    };
  }, [key]);
  return {
    ready: !key || status.key === key,
    error: status.key === key && !status.result.ok ? status.result.error.message : null,
  };
}
