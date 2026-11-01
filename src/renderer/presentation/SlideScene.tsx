import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { presentationFont, presentationTheme } from '../../shared/presentation-theme';
import { ProcessDiagram } from './ProcessDiagram';
import { CodeExplanation } from './CodeExplanation';
import { SceneMedia } from './SceneMedia';
import { SceneText } from './SceneText';
import type { SceneProps } from './scene-props';

export type { SceneProps };
export function SlideScene({
  slide,
  theme: inputTheme,
  reveal,
  slideNumber,
  slideCount,
  editing,
  mediaEditing,
  mediaActive = true,
  mediaAutoplay = false,
}: SceneProps): React.JSX.Element {
  const theme = presentationTheme(inputTheme);
  const frame = useCurrentFrame();
  const progress =
    theme.animation === 'none'
      ? 1
      : interpolate(frame, [0, 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const entrance = reveal === 0 ? progress : 1;
  let headingSize = slide.layout === 'title' && !slide.media ? 116 : 76;
  if (slide.title.length > 75) headingSize = 80;
  if (slide.title.length > 120) headingSize = 64;
  const revealSize = Math.min(37, Math.floor(390 / Math.max(1, slide.reveals.length)));
  return (
    <AbsoluteFill
      className="slide-scene"
      style={{
        backgroundColor: theme.background,
        color: theme.foreground,
        fontFamily: presentationFont(theme.bodyFont),
        padding: theme.padding,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          marginBlock: 'auto',
          opacity: entrance,
          transform: `translateY(${(theme.animation === 'rise' ? (1 - entrance) * 14 : 0).toString()}px)`,
          maxWidth: slide.media ? 760 : 1664,
        }}
      >
        <SceneText
          field="title"
          value={slide.title}
          editing={editing}
          style={{
            fontSize: headingSize,
            lineHeight: 1.15,
            minHeight: '1.15em',
            fontWeight: 550,
            letterSpacing: -3,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        />
        {(slide.body || editing) && (
          <SceneText
            field="body"
            value={slide.body}
            editing={editing}
            style={{
              marginTop: 36,
              color: theme.muted,
              fontSize: 34,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              maxWidth: 1430,
            }}
          />
        )}
        {slide.layout === 'process' && (
          <ProcessDiagram theme={theme} steps={slide.reveals} reveal={reveal} progress={progress} />
        )}
        {slide.layout === 'code' && (
          <CodeExplanation
            theme={theme}
            code={slide.code ?? '// Add your code here.'}
            notes={slide.reveals}
            reveal={reveal}
            progress={progress}
            editing={editing}
          />
        )}
        {!['process', 'code'].includes(slide.layout) && slide.reveals.length > 0 && (
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
                    transform: `translateY(${(theme.animation === 'rise' ? (1 - opacity) * 12 : 0).toString()}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: presentationFont(theme.monoFont),
                      color: theme.accent,
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
      {slide.media && (
        <SceneMedia
          editing={mediaEditing}
          key={slide.media.id}
          media={slide.media}
          active={mediaActive}
          autoplay={mediaAutoplay}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontFamily: presentationFont(theme.monoFont),
          color: theme.muted,
          fontSize: 15,
          letterSpacing: 2,
        }}
      >
        <span>
          {slideNumber.toString().padStart(2, '0')} / {slideCount.toString().padStart(2, '0')}
        </span>
      </div>
    </AbsoluteFill>
  );
}
