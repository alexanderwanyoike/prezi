import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { Slide } from '../../shared/project';

export interface SceneProps extends Record<string, unknown> {
  slide: Slide;
  reveal: number;
  slideNumber: number;
  slideCount: number;
}
export function SlideScene({
  slide,
  reveal,
  slideNumber,
  slideCount,
}: SceneProps): React.JSX.Element {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entrance = reveal === 0 ? progress : 1;
  let headingSize = slide.layout === 'title' ? 116 : 76;
  if (slide.title.length > 75) headingSize = 80;
  if (slide.title.length > 120) headingSize = 64;
  const revealSize = Math.min(37, Math.floor(390 / Math.max(1, slide.reveals.length)));
  return (
    <AbsoluteFill
      className="slide-scene"
      style={{
        backgroundColor: '#101513',
        color: '#edf2ec',
        fontFamily: 'Manrope Variable, sans-serif',
        padding: 128,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 18,
          color: '#9bbb9f',
          letterSpacing: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <span style={{ width: 36, height: 2, backgroundColor: '#7fa989' }} />
        THE 0SMOSYS SHOW
      </div>
      <div
        style={{
          opacity: entrance,
          transform: `translateY(${((1 - entrance) * 14).toString()}px)`,
          maxWidth: 1550,
        }}
      >
        <h2
          style={{
            fontSize: headingSize,
            lineHeight: 1.15,
            fontWeight: 550,
            letterSpacing: -3,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {slide.title}
        </h2>
        {slide.body && (
          <p
            style={{
              marginTop: 36,
              color: '#a5b2a8',
              fontSize: 34,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              maxWidth: 1430,
            }}
          >
            {slide.body}
          </p>
        )}
        {slide.reveals.length > 0 && (
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {slide.reveals.slice(0, reveal).map((text, index) => {
              const opacity = index === reveal - 1 ? progress : 1;
              return (
                <div
                  key={text}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 28,
                    fontSize: revealSize,
                    opacity,
                    transform: `translateY(${((1 - opacity) * 12).toString()}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      color: '#85ad8e',
                      fontSize: revealSize * 0.65,
                    }}
                  >
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#84968a',
          fontSize: 15,
          letterSpacing: 2,
        }}
      >
        <span>NOTES FROM THE BUILD</span>
        <span>
          {slideNumber.toString().padStart(2, '0')} / {slideCount.toString().padStart(2, '0')}
        </span>
      </div>
    </AbsoluteFill>
  );
}
