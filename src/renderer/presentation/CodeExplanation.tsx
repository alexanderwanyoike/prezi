import { SceneText } from './SceneText';
import type { SceneEditing } from './SceneText';

export function CodeExplanation({
  code,
  notes,
  reveal,
  progress,
  editing,
}: {
  code: string;
  notes: string[];
  reveal: number;
  progress: number;
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
        style={{ padding: 32, background: '#162019', border: '1px solid #36483c', borderRadius: 8 }}
      >
        <div
          style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            color: '#9bbb9f',
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
            fontFamily: 'IBM Plex Mono, monospace',
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
              color: index === reveal - 1 ? '#edf2ec' : '#a5b2a8',
            }}
          >
            <span
              style={{
                color: '#9bbb9f',
                fontFamily: 'IBM Plex Mono',
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
