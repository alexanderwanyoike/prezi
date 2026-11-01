import { createRoot } from 'react-dom/client';
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { z } from 'zod';
import { sampleTransition } from './sample-transition';
import { SlideScene } from '../renderer/presentation/SlideScene';
import type { Slide } from '../shared/project';
import type { PresentationTheme } from '../shared/presentation-theme';
import { presentationFont, presentationTheme } from '../shared/presentation-theme';
import { useProjectFonts } from '../renderer/useProjectFonts';
import { runtimeMessageSchema } from '../shared/scene-runtime';
import type { RuntimeState, RuntimeDefinition, RuntimeEvent } from '../shared/scene-runtime';
import { sceneContext } from './context';
import { SceneBoundary } from './SceneBoundary';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import './runtime.css';
import '../renderer/styles/presentation.css';

interface SceneProps extends Record<string, unknown> {
  theme: PresentationTheme & { fontFamily: string; monoFamily: string };
  title: string;
  body: string;
  reveal: number;
  reveals: readonly string[];
  hasMedia: boolean;
  props: RuntimeState['properties'];
}
const moduleSchema = z.object({
  default: z.custom<ComponentType<SceneProps>>((value) => typeof value === 'function'),
});
function emit(event: RuntimeEvent): void {
  window.parent.postMessage(event, '*');
}
function failed(message: string): void {
  document.documentElement.dataset.state = 'error';
  document.documentElement.dataset.error = message.slice(0, 2000);
  emit({ type: 'prezi:status', state: 'error', message: message.slice(0, 2000) });
}
function sceneError({ error }: { error: Error }): React.JSX.Element {
  failed(error.message);
  return <p role="alert">{error.message}</p>;
}
function presetComponent(
  slide: Slide,
  slideNumber: number,
  slideCount: number,
): ComponentType<SceneProps> {
  return function Preset({
    theme,
    reveal,
  }: {
    theme: PresentationTheme;
    reveal: number;
  }): React.JSX.Element {
    return (
      <SlideScene
        slide={slide}
        theme={theme}
        reveal={reveal}
        slideNumber={slideNumber}
        slideCount={slideCount}
        mediaActive={false}
        mediaAutoplay={false}
      />
    );
  };
}
function Runtime(): React.JSX.Element | null {
  const [loaded, setLoaded] = useState<{
    Component: ComponentType<SceneProps>;
    definition: RuntimeDefinition;
  } | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      emit({ type: 'prezi:heartbeat' });
      if (!loaded) emit({ type: 'prezi:boot', instance: window.location.hostname });
    }, 500);
    return () => window.clearInterval(timer);
  }, [loaded]);
  const [state, setState] = useState<RuntimeState | null>(null);
  const fonts = useProjectFonts(state?.fonts, state?.theme);
  useEffect(() => {
    if (fonts.error) failed(fonts.error);
  }, [fonts.error]);
  const player = useRef<PlayerRef>(null);
  useEffect(() => {
    let live = true;
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.source !== window.parent) return;
      const parsed = runtimeMessageSchema.safeParse(event.data);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === 'prezi:transition') {
        void sampleTransition(message.code, message.properties).then((result) => {
          if (!live) return;
          if (!result.ok) {
            failed(result.error.message);
            return;
          }
          document.documentElement.dataset.samples = JSON.stringify(result.value);
          document.documentElement.dataset.state = 'ready';
        });
        return;
      }
      setState(message.state);
      if (message.type === 'prezi:preset') {
        setLoaded({
          Component: presetComponent(message.slide, message.slideNumber, message.slideCount),
          definition: {
            id: message.slide.id,
            name: message.slide.title || 'Untitled slide',
            fields: {},
            layers: [],
          },
        });
      }
      if (message.type === 'prezi:load') {
        const url = URL.createObjectURL(new Blob([message.code], { type: 'text/javascript' }));
        void import(/* @vite-ignore */ url)
          .then((value: unknown) => {
            const module = moduleSchema.safeParse(value);
            if (!module.success) {
              failed('Export a default React scene component.');
              return;
            }
            if (live) setLoaded({ Component: module.data.default, definition: message.definition });
          })
          .catch((error: unknown) => {
            failed(error instanceof Error ? error.message : 'The scene module could not load.');
          })
          .finally(() => {
            URL.revokeObjectURL(url);
          });
      }
    };
    window.addEventListener('message', receive);
    emit({ type: 'prezi:boot', instance: window.location.hostname });
    return () => {
      live = false;
      window.removeEventListener('message', receive);
    };
  }, []);
  const reveal = state?.reveal;
  const probeFrame = state?.probeFrame;
  useLayoutEffect(() => {
    if (!loaded) return;
    player.current?.pause();
    player.current?.seekTo(probeFrame ?? 0);
    if (probeFrame === undefined) player.current?.play();
  }, [loaded, reveal, probeFrame]);
  useEffect(() => {
    if (!loaded || !state || !fonts.ready) return undefined;
    let timer = requestAnimationFrame(() => {
      timer = requestAnimationFrame(() => {
        if (document.documentElement.dataset.state !== 'error') {
          document.documentElement.dataset.state = 'ready';
          emit({ type: 'prezi:status', state: 'ready', reveal: state.reveal });
        }
      });
    });
    return () => {
      cancelAnimationFrame(timer);
    };
  }, [loaded, state, fonts.ready]);
  useEffect(() => {
    if (!state?.editing) return undefined;
    const select = (event: PointerEvent | FocusEvent): void => {
      const element =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-layer]') : null;
      const layer = element?.dataset.layer;
      if (layer) emit({ type: 'prezi:select', layer });
    };
    window.addEventListener('pointerdown', select);
    window.addEventListener('focusin', select);
    return () => {
      window.removeEventListener('pointerdown', select);
      window.removeEventListener('focusin', select);
    };
  }, [state?.editing]);
  const editing = state?.editing;
  useEffect(() => {
    if (editing !== false) return undefined;
    const keydown = (event: KeyboardEvent): void => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ![' ', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (
        event.key !== 'Escape' &&
        event.target instanceof Element &&
        event.target.closest('video,[data-media-controls]')
      )
        return;
      const { key } = event;
      if (key === ' ' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Escape') {
        event.preventDefault();
        emit({ type: 'prezi:key', key, repeat: event.repeat });
      }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
    };
  }, [editing]);
  const context = useMemo(
    () => (loaded && state ? { definition: loaded.definition, state, emit } : null),
    [loaded, state],
  );
  if (!loaded || !state) return null;
  const { Component: Scene, definition } = loaded;
  const properties = {
    ...Object.fromEntries(
      Object.entries(definition.fields).map(([key, field]) => [key, field.default]),
    ),
    ...state.properties,
  };
  return (
    <sceneContext.Provider value={context}>
      <SceneBoundary failed={failed}>
        <div className="composition-viewport">
          <div className="composition-transform">
            <Player
              ref={player}
              component={Scene}
              errorFallback={sceneError}
              inputProps={{
                theme: {
                  ...presentationTheme(state.theme),
                  fontFamily: presentationFont(presentationTheme(state.theme).bodyFont),
                  monoFamily: presentationFont(presentationTheme(state.theme).monoFont),
                },
                title: state.title,
                body: state.body,
                reveal: state.reveal,
                reveals: state.reveals ?? [],
                hasMedia: state.media !== null,
                props: properties,
              }}
              compositionWidth={1920}
              compositionHeight={1080}
              durationInFrames={12}
              fps={30}
              autoPlay={probeFrame === undefined}
              initialFrame={probeFrame ?? 0}
              moveToBeginningWhenEnded={false}
              controls={false}
              numberOfSharedAudioTags={0}
              clickToPlay={false}
              doubleClickToFullscreen={false}
              spaceKeyToPlayOrPause={false}
              style={{ width: 1920, height: 1080 }}
            />
          </div>
        </div>
      </SceneBoundary>
    </sceneContext.Provider>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('The scene root is missing.');
createRoot(root).render(<Runtime />);
window.addEventListener('error', (event) => {
  failed(event.message);
});
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason: unknown = Reflect.get(event, 'reason');
  failed(reason instanceof Error ? reason.message : 'The scene raised an asynchronous error.');
});
