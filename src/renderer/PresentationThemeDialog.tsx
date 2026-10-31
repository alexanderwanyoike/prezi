import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FontCredits } from './FontCredits';
import type { FontCredit, ProjectFont } from '../shared/fonts';
import { presentationTheme } from '../shared/presentation-theme';
import type { PresentationTheme } from '../shared/presentation-theme';
import { NumberField } from './NumberField';

export function PresentationThemeDialog({
  value,
  fonts,
  importFont,
  replaceFont,
  updateFont,
  change,
  close,
}: {
  value: PresentationTheme | undefined;
  fonts: ProjectFont[];
  importFont: () => void;
  replaceFont: (id: string) => void;
  updateFont: (id: string, patch: FontCredit) => void;
  change: (patch: Partial<PresentationTheme>) => void;
  close: () => void;
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const theme = presentationTheme(value);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const colors = {
    background: 'Background',
    foreground: 'Text colour',
    muted: 'Secondary text',
    accent: 'Accent colour',
    surface: 'Panel colour',
    border: 'Diagram border',
  } as const;
  return (
    <dialog
      ref={dialog}
      className="connection-dialog presentation-theme-dialog"
      aria-label="Presentation theme"
      onCancel={close}
    >
      <div className="panel-heading">
        <h2>Presentation theme</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close presentation theme"
          onClick={close}
        >
          <X size={16} />
        </button>
      </div>
      <p className="muted small">
        Saved with this deck. Changes apply to reusable layouts and use shared Undo.
      </p>
      <div className="theme-fields">
        {Object.entries(colors).map(([key, label]) => {
          const name = key as keyof typeof colors;
          return (
            <div key={name}>
              <label htmlFor={`theme-${name}`}>{label}</label>
              <input
                id={`theme-${name}`}
                type="color"
                value={theme[name]}
                onChange={(event) => {
                  change({ [name]: event.target.value });
                }}
              />
            </div>
          );
        })}
        {(['bodyFont', 'monoFont'] as const).map((name) => (
          <div key={name}>
            <label htmlFor={`theme-${name}`}>
              {name === 'bodyFont' ? 'Body font' : 'Detail font'}
            </label>
            <select
              id={`theme-${name}`}
              value={theme[name]}
              onChange={(event) => {
                change({ [name]: event.target.value });
              }}
            >
              <option value="manrope">Manrope</option>
              <option value="plex">IBM Plex Mono</option>
              {fonts.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        <NumberField
          label="Canvas padding"
          value={theme.padding}
          min={64}
          max={180}
          change={(padding) => {
            change({ padding });
          }}
        />
        <NumberField
          label="Crossfade milliseconds"
          value={theme.transitionMs}
          min={250}
          max={400}
          change={(transitionMs) => {
            change({ transitionMs });
          }}
        />
        <div>
          <label htmlFor="theme-animation">Entrance motion</label>
          <select
            id="theme-animation"
            value={theme.animation}
            onChange={(event) => {
              change({
                animation:
                  (['rise', 'fade', 'none'] as const).find(
                    (animation) => animation === event.target.value,
                  ) ?? 'rise',
              });
            }}
          >
            <option value="rise">Gentle rise</option>
            <option value="fade">Fade</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>
      <button type="button" onClick={importFont} disabled={fonts.length >= 16}>
        Import font…
      </button>
      <FontCredits fonts={fonts} update={updateFont} locate={replaceFont} />
    </dialog>
  );
}
