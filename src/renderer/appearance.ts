import { useEffect, useState } from 'react';
import { z } from 'zod';
import { failure } from '../shared/result';
import type { Result } from '../shared/result';

const schema = z.object({
  theme: z.enum(['studio', 'aluminium', 'paper']),
  mode: z.enum(['light', 'dark']),
  accent: z.enum(['sage', 'cobalt', 'amber', 'plum', 'copper']),
});
export type Appearance = z.infer<typeof schema>;
const defaults: Appearance = { theme: 'studio', mode: 'dark', accent: 'sage' };

function readAppearance(): Result<Appearance> {
  try {
    const saved = localStorage.getItem('prezi.appearance');
    if (!saved) return { ok: true, value: defaults };
    const value: unknown = JSON.parse(saved);
    const parsed = schema.safeParse(value);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : failure(
          'INVALID_INPUT',
          'Appearance preferences were invalid. Choose them again to reset.',
        );
  } catch {
    return failure('IO_ERROR', 'Appearance preferences could not be read.');
  }
}

export function useAppearance(): {
  appearance: Appearance;
  error: string | null;
  change: (patch: Partial<Appearance>) => void;
} {
  const [initial] = useState(readAppearance);
  const [appearance, setAppearance] = useState(initial.ok ? initial.value : defaults);
  const [error, setError] = useState<string | null>(initial.ok ? null : initial.error.message);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = appearance.theme;
    root.dataset.mode = appearance.mode;
    root.dataset.accent = appearance.accent;
  }, [appearance]);
  function change(patch: Partial<Appearance>): void {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    try {
      localStorage.setItem('prezi.appearance', JSON.stringify(next));
      setError(null);
    } catch {
      setError('Appearance changed for this session but could not be saved.');
    }
  }
  return { appearance, error, change };
}
