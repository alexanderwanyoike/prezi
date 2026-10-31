import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Maximize, X } from 'lucide-react';
import type { Project } from '../../shared/project';
import { navigate, startPosition } from '../../shared/presentation/navigation';
import { presentationAction } from '../../shared/presentation/keyboard';
import { ANIMATION_MS, ScenePlayer } from './ScenePlayer';
import type { SceneProps } from './SlideScene';

interface Props {
  project: Project;
  exit: () => void;
}
export function PresentationView({ project, exit }: Props): React.JSX.Element {
  const [position, setPosition] = useState(() => startPosition(project));
  const [outgoing, setOutgoing] = useState<SceneProps | null>(null);
  const [busy, setBusy] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedUntil = useRef(performance.now() + ANIMATION_MS);
  const index = Math.max(
    0,
    project.slides.findIndex((slide) => slide.id === position.slideId),
  );
  const slide = project.slides[index];
  const reveal = Math.min(position.reveal, slide?.reveals.length ?? 0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusy(false);
      setOutgoing(null);
    }, ANIMATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [position]);
  const leave = useCallback((): void => {
    void window.prezi.fullscreen(false).then((result) => {
      if (result.ok) exit();
      else setError(result.error.message);
    });
  }, [exit]);
  const move = useCallback(
    (direction: 'advance' | 'back'): void => {
      if (performance.now() < lockedUntil.current) return;
      const next = navigate(project, position, direction);
      if (next.slideId === position.slideId && next.reveal === position.reveal) return;
      if (next.slideId !== position.slideId && slide)
        setOutgoing({ slide, reveal, slideNumber: index + 1, slideCount: project.slides.length });
      lockedUntil.current = performance.now() + ANIMATION_MS;
      setBusy(true);
      setPosition(next);
    },
    [index, position, project, reveal, slide],
  );
  useEffect(() => {
    function keydown(event: KeyboardEvent): void {
      const typing =
        event.target instanceof Element &&
        !!event.target.closest('input,textarea,select,[contenteditable="true"]');
      if (
        !typing &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        [' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        event.preventDefault();
      const action = presentationAction(event, typing, performance.now() < lockedUntil.current);
      if (action === 'exit') {
        event.preventDefault();
        leave();
      } else if (action) move(action);
    }
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
    };
  }, [leave, move]);
  if (!slide) return <main role="alert">The presentation has no slides.</main>;
  const scene: SceneProps = {
    slide,
    reveal,
    slideNumber: index + 1,
    slideCount: project.slides.length,
  };
  return (
    <main className={`presenting ${fullscreen ? 'is-fullscreen' : ''}`}>
      <div className="presentation-stage-wrap">
        <section
          className="presentation-stage"
          aria-label="Presentation stage"
          data-slide={index + 1}
          data-reveal={reveal}
          data-busy={busy}
        >
          {outgoing && (
            <div className="presentation-outgoing" aria-hidden="true">
              <ScenePlayer scene={outgoing} still />
            </div>
          )}
          <div
            className={outgoing ? 'presentation-incoming' : ''}
            key={`${slide.id}:${reveal.toString()}`}
          >
            <ScenePlayer scene={scene} />
          </div>
        </section>
      </div>
      <div className="presenter-toolbar">
        <button type="button" onClick={leave}>
          <X size={14} />
          Back to editor
        </button>
        <span className="presenter-hint">
          SPACE / NEXT <span>·</span> ← / BACK <span>·</span> ESC / LEAVE
        </span>
        <div>
          <button
            type="button"
            className="icon-button"
            aria-label="Previous reveal"
            disabled={busy}
            onClick={() => {
              move('back');
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <span className="small">
            {index + 1} / {project.slides.length}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Next reveal"
            disabled={busy}
            onClick={() => {
              move('advance');
            }}
          >
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              void window.prezi.fullscreen(true).then((result) => {
                if (result.ok) setFullscreen(true);
                else setError(result.error.message);
              });
            }}
          >
            <Maximize size={14} />
            Full screen
          </button>
        </div>
      </div>
      {error && (
        <div className="presentation-error" role="alert">
          {error}
        </div>
      )}
    </main>
  );
}
