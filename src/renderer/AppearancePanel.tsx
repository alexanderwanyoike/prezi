import { X } from 'lucide-react';
import type { Appearance } from './appearance';

interface Props {
  appearance: Appearance;
  change: (patch: Partial<Appearance>) => void;
  close: () => void;
}

export function AppearancePanel({ appearance, change, close }: Props): React.JSX.Element {
  return (
    <section className="appearance-popover" role="dialog" aria-label="Appearance preferences">
      <div className="panel-heading">
        <span>Appearance</span>
        <button type="button" className="icon-button" aria-label="Close appearance" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <fieldset>
        <legend>Mode</legend>
        <div className="option-row">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={appearance.mode === mode}
              onClick={() => {
                change({ mode });
              }}
            >
              {mode === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Material</legend>
        <div className="option-row">
          {(['studio', 'aluminium', 'paper'] as const).map((theme) => (
            <button
              type="button"
              key={theme}
              aria-pressed={appearance.theme === theme}
              onClick={() => {
                change({ theme });
              }}
            >
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Accent</legend>
        <div className="accent-row">
          {(['sage', 'cobalt', 'amber', 'plum', 'copper'] as const).map((accent) => (
            <button
              type="button"
              className="accent-option"
              data-accent={accent}
              key={accent}
              aria-label={accent.charAt(0).toUpperCase() + accent.slice(1)}
              title={accent}
              aria-pressed={appearance.accent === accent}
              onClick={() => {
                change({ accent });
              }}
            >
              <span />
            </button>
          ))}
        </div>
      </fieldset>
      <p className="small muted">Your editor theme leaves the deck unchanged.</p>
    </section>
  );
}
