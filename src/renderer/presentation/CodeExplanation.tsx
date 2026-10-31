import { presentationFont } from '../../shared/presentation-theme';
import type { PresentationTheme } from '../../shared/presentation-theme';
import { SceneText } from './SceneText';
import type { SceneEditing } from './SceneText';

export function CodeExplanation({
  code,
  notes,
  reveal,
  progress,
  theme,
  editing,
}: {
  code: string;
  notes: string[];
  reveal: number;
  progress: number;
  theme: PresentationTheme;
  editing?: SceneEditing | undefined;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: 56,
        marginTop: 48,
      }}
    >
      <div
        style={{
          padding: 32,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontFamily: presentationFont(theme.monoFont),
            fontSize: 14,
            color: theme.accent,
            letterSpacing: 2,
            marginBottom: 24,
          }}
        >
          SOURCE / WALKTHROUGH
        </div>
        <SceneText
          field="code"
          value={code}
          editing={editing}
          style={{
            fontFamily: presentationFont(theme.monoFont),
            fontSize: 26,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            maxHeight: 460,
            overflow: 'hidden',
            margin: 0,
          }}
        />
      </div>
      <div
        style={{ fontSize: 28, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 22 }}
      >
        {notes.slice(0, reveal).map((note, index) => (
          <div
            key={`${index.toString()}:${note}`}
            style={{
              opacity: index === reveal - 1 ? progress : 1,
              color: index === reveal - 1 ? theme.foreground : theme.muted,
            }}
          >
            <span
              style={{
                color: theme.accent,
                fontFamily: presentationFont(theme.monoFont),
                fontSize: 16,
                marginRight: 16,
              }}
            >
              {(index + 1).toString().padStart(2, '0')}
            </span>
            {note}
          </div>
        ))}
      </div>
    </div>
  );
}
