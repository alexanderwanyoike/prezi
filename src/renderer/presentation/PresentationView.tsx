import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Maximize, X } from 'lucide-react';
import { presentationTheme } from '../../shared/presentation-theme';
import type { Project } from '../../shared/project';
import { navigate, startPosition } from '../../shared/presentation/navigation';
import { presentationAction } from '../../shared/presentation/keyboard';
import { ANIMATION_MS, ScenePlayer } from './ScenePlayer';
import { TransitionLayer } from './TransitionLayer';
import type { SlideMotion } from './TransitionLayer';
import { usePresentationStep } from './usePresentationStep';
import type { SceneProps } from './SlideScene';

interface Props {
  project: Project;
  exit: () => void;
}
export function PresentationView({ project, exit }: Props): React.JSX.Element {
  const { transitionMs } = presentationTheme(project.theme);
  const [position, setPosition] = useState(() => startPosition(project));
  const [outgoing, setOutgoing] = useState<SceneProps | null>(null);
  const [motion, setMotion] = useState<SlideMotion | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { busy, playing, generation, begin, ready, locked } = usePresentationStep(
    position.slideId,
    position.reveal,
    ANIMATION_MS,
    () => {
      setOutgoing(null);
      setMotion(null);
    },
  );
  const index = Math.max(
    0,
    project.slides.findIndex((slide) => slide.id === position.slideId),
  );
  const slide = project.slides[index];
  const reveal = Math.min(position.reveal, slide?.reveals.length ?? 0);
  const activeSlideId = slide?.id;
  const sceneReady = useCallback(() => {
    if (activeSlideId) ready(activeSlideId, reveal);
  }, [activeSlideId, reveal, ready]);
  useEffect(() => {
    if (activeSlideId && (activeSlideId !== position.slideId || reveal !== position.reveal)) {
      begin(activeSlideId, reveal, ANIMATION_MS);
      setOutgoing(null);
      setMotion(null);
      setPosition({ slideId: activeSlideId, reveal });
    }
  }, [activeSlideId, reveal, position.slideId, position.reveal, begin]);
  useEffect(() => {
    if (activeSlideId)
      void window.prezi
        .publishView({ presentation: { slideId: activeSlideId, reveal } })
        .then((result) => {
          if (!result.ok) setError(result.error.message);
        });
  }, [activeSlideId, reveal]);
  useEffect(
    () => () => {
      void window.prezi.publishView({ presentation: null });
    },
    [],
  );

  const leave = useCallback((): void => {
    void window.prezi.fullscreen(false).then((result) => {
      if (result.ok) exit();
      else setError(result.error.message);
    });
  }, [exit]);
  const move = useCallback(
    (direction: 'advance' | 'back'): void => {
      if (locked()) return;
      const next = navigate(project, position, direction);
      if (next.slideId === position.slideId && next.reveal === position.reveal) return;
      if (next.slideId !== position.slideId && slide)
        setOutgoing({
          slide,
          theme: project.theme,
          fonts: project.fonts,
          reveal,
          slideNumber: index + 1,
          slideCount: project.slides.length,
          definition: project.scenes?.[slide.scene?.definitionId ?? ''],
        });
      const changingSlide = next.slideId !== position.slideId;
      setMotion(
        changingSlide
          ? { definition: project.transition, durationMs: transitionMs, navigation: direction }
          : null,
      );
      begin(next.slideId, next.reveal, changingSlide ? transitionMs : ANIMATION_MS);
      setPosition(next);
    },
    [index, position, project, reveal, slide, transitionMs, locked, begin],
  );
  useEffect(() => {
    function keydown(event: KeyboardEvent): void {
      const typing =
        (event.target instanceof Element &&
          !!event.target.closest('input,textarea,select,[contenteditable="true"]')) ||
        (event.key !== 'Escape' &&
          event.target instanceof Element &&
          !!event.target.closest('video,[data-media-controls]'));
      if (
        !typing &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        [' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        event.preventDefault();
      const action = presentationAction(event, typing, locked());
      if (action === 'exit') {
        event.preventDefault();
        leave();
      } else if (action) move(action);
    }
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
    };
  }, [leave, move, locked]);
  if (!slide) return <main role="alert">The presentation has no slides.</main>;
  const scene: SceneProps = {
    slide,
    theme: project.theme,
    fonts: project.fonts,
    reveal,
    slideNumber: index + 1,
    slideCount: project.slides.length,
    definition: project.scenes?.[slide.scene?.definitionId ?? ''],
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
          {[...(outgoing ? [outgoing] : []), scene].map((layer) => {
            const leaving = layer.slide.id !== slide.id;
            return (
              <TransitionLayer
                motion={motion}
                playing={playing}
                generation={generation}
                leaving={leaving}
                key={layer.slide.id}
              >
                <ScenePlayer
                  scene={layer}
                  still={leaving}
                  onReady={leaving ? undefined : sceneReady}
                />
              </TransitionLayer>
            );
          })}
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
