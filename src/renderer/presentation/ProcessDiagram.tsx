import { Fragment } from 'react';

export function ProcessDiagram({
  steps,
  reveal,
  progress,
}: {
  steps: string[];
  reveal: number;
  progress: number;
}): React.JSX.Element {
  const columns = Math.max(1, steps.length > 4 ? 3 : steps.length);
  return (
    <div
      role="group"
      aria-label="Workflow diagram"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.toString()}, minmax(0, 1fr))`,
        gap: 36,
        marginTop: 64,
      }}
    >
      {steps.slice(0, reveal).map((text, index) => {
        const opacity = index === reveal - 1 ? progress : 1;
        return (
          <Fragment key={`${index.toString()}:${text}`}>
            <div
              data-process-stage={index}
              style={{
                position: 'relative',
                minHeight: 220,
                padding: 32,
                border: `2px solid ${index === reveal - 1 ? '#9bbb9f' : '#36483c'}`,
                borderRadius: 10,
                background: index === reveal - 1 ? '#1e3026' : '#162019',
                opacity,
                transform: `translateY(${((1 - opacity) * 14).toString()}px)`,
              }}
            >
              {index > 0 && (
                <span
                  data-process-arrow
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: index % columns === 0 ? 32 : -33,
                    top: index % columns === 0 ? -38 : 98,
                    fontSize: 30,
                    color: '#9bbb9f',
                  }}
                >
                  {index % columns === 0 ? '↓' : '→'}
                </span>
              )}
              <span
                style={{
                  display: 'block',
                  color: '#9bbb9f',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 18,
                  marginBottom: 32,
                }}
              >
                {(index + 1).toString().padStart(2, '0')}
              </span>
              <span style={{ fontSize: 28, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                {text}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
