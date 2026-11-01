import type { FontCredit, ProjectFont } from '../shared/fonts';
import { EditableText } from './EditableText';

export function FontCredits({
  fonts,
  update,
  locate,
}: {
  fonts: ProjectFont[];
  update: (id: string, patch: FontCredit) => void;
  locate: (id: string) => void;
}): React.JSX.Element | null {
  if (!fonts.length) return null;
  return (
    <section className="font-credits">
      <p className="small muted">Imported fonts and supplied notices travel with the project.</p>
      {fonts.map((font) => (
        <fieldset key={font.id}>
          <legend>{font.name}</legend>
          <button
            type="button"
            onClick={() => {
              locate(font.id);
            }}
          >
            Locate font…
          </button>
          <label htmlFor={`font-${font.id}-source`}>Source / attribution</label>
          <EditableText
            id={`font-${font.id}-source`}
            value={font.provenance ?? ''}
            maxLength={2048}
            commit={(provenance) => {
              update(font.id, { provenance });
            }}
          />
          <label htmlFor={`font-${font.id}-license`}>Licence notice</label>
          <EditableText
            id={`font-${font.id}-license`}
            value={font.license ?? ''}
            rows={4}
            maxLength={65536}
            commit={(license) => {
              update(font.id, { license });
            }}
          />
        </fieldset>
      ))}
    </section>
  );
}
