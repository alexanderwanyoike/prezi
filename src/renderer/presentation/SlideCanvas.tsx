import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ProjectFont } from '../../shared/fonts';
import type { PresentationTheme } from '../../shared/presentation-theme';
import type { CustomSceneDefinition } from '../../shared/scene-definition';
import type { CustomSceneEditing } from './CustomScenePlayer';
import type { Slide } from '../../shared/project';
import { ScenePlayer } from './ScenePlayer';
import type { SceneEditing } from './SceneText';

interface Props {
  fonts?: ProjectFont[] | undefined;
  theme?: PresentationTheme | undefined;
  slide: Slide;
  pending: boolean;
  index: number;
  count: number;
  editing: SceneEditing;
  definition?: CustomSceneDefinition | undefined;
  customEditing?: CustomSceneEditing | undefined;
}
export function SlideCanvas({
  slide,
  theme,
  fonts,
  index,
  count,
  editing,
  pending,
  definition,
  customEditing,
}: Props): React.JSX.Element {
  const [reveal, setReveal] = useState(0);
  const [run, setRun] = useState(0);
  const step = Math.min(reveal, slide.reveals.length);
  function preview(next: number): void {
    setReveal(next);
  }
  if (pending)
    return (
      <main className="workspace" role="status">
        Opening the selected slide…
      </main>
    );
  return (
    <main className="workspace">
      <div className="canvas-heading">
        <span>SLIDE {(index + 1).toString().padStart(2, '0')}</span>
        <span>
          1920 × 1080 <span className="muted">/</span> 16:9
        </span>
      </div>
      <div className="canvas-wrap" aria-label="Slide preview">
        <div className="scene-player">
          <ScenePlayer
            key={`${slide.id}:${run.toString()}`}
            scene={{
              slide,
              theme,
              fonts,
              reveal: step,
              slideNumber: index + 1,
              slideCount: count,
              editing,
              definition,
              customEditing,
            }}
          />
        </div>
      </div>
      <div className="canvas-toolbar">
        <button
          type="button"
          className="preview-restart"
          onClick={() => {
            setRun(run + 1);
            preview(0);
          }}
        >
          <RotateCcw size={12} />
          Restart preview
        </button>
        <span className="zoom-label">Click text to edit · FIT</span>
      </div>
      <section className="reveal-strip" aria-label="Reveal overview">
        <div>
          <span className="eyebrow">REVEAL STEPS</span>
          <p>One thought at a time.</p>
        </div>
        <div className="reveal-chips">
          <button
            type="button"
            className={`reveal-chip ${step === 0 ? 'active' : ''}`}
            aria-pressed={step === 0}
            onClick={() => {
              preview(0);
            }}
          >
            00 <span>Initial state</span>
          </button>
          {slide.reveals.map((text, order) => (
            <button
              type="button"
              className={`reveal-chip ${step === order + 1 ? 'active' : ''}`}
              key={text}
              aria-pressed={step === order + 1}
              onClick={() => {
                preview(order + 1);
              }}
            >
              {(order + 1).toString().padStart(2, '0')} <span>{text.split(' / ')[0]}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
