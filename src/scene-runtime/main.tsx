import { createRoot } from 'react-dom/client';
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { z } from 'zod';
import type { PresentationTheme } from '../shared/presentation-theme';
import { presentationFont, presentationTheme } from '../shared/presentation-theme';
import { runtimeMessageSchema } from '../shared/scene-runtime';
import type { RuntimeState, RuntimeDefinition, RuntimeEvent } from '../shared/scene-runtime';
import { sceneContext } from './context';
import { SceneBoundary } from './SceneBoundary';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import './runtime.css';

interface SceneProps extends Record<string, unknown> {
  theme: PresentationTheme & { fontFamily: string; monoFamily: string };
  title: string;
  body: string;
  reveal: number;
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
function Runtime(): React.JSX.Element | null {
  const [loaded, setLoaded] = useState<{
    Component: ComponentType<SceneProps>;
    definition: RuntimeDefinition;
  } | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const player = useRef<PlayerRef>(null);
  useEffect(() => {
    let live = true;
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.source !== window.parent) return;
      const parsed = runtimeMessageSchema.safeParse(event.data);
      if (!parsed.success) return;
      const message = parsed.data;
      setState(message.state);
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
    if (!loaded || !state) return undefined;
    let timer = requestAnimationFrame(() => {
      timer = requestAnimationFrame(() => {
        if (document.documentElement.dataset.state !== 'error') {
          document.documentElement.dataset.state = 'ready';
          emit({ type: 'prezi:status', state: 'ready' });
        }
      });
    });
    return () => {
      cancelAnimationFrame(timer);
    };
  }, [loaded, state]);
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
