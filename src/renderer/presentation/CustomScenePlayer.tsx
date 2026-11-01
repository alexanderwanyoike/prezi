import { useEffect, useRef, useState } from 'react';
import { useSceneWatchdog } from './useSceneWatchdog';
import type { FramePatch } from './FrameEditor';
import type { CustomSceneDefinition, SceneValues } from '../../shared/scene-definition';
import { runtimeEventSchema } from '../../shared/scene-runtime';
import type { RuntimeState } from '../../shared/scene-runtime';
import type { SceneProps } from './SlideScene';

export interface CustomSceneEditing {
  selected: string | null;
  pending: boolean;
  select: (layer: string) => void;
  frame: (layer: string, patch: FramePatch) => void;
  update: (property: string, value: SceneValues[string]) => void;
}
export function CustomScenePlayer({
  scene,
  definition,
  still,
  onReady,
}: {
  scene: SceneProps;
  definition: CustomSceneDefinition;
  still: boolean;
  onReady?: (() => void) | undefined;
}): React.JSX.Element {
  const iframe = useRef<HTMLIFrameElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  const [instance, setInstance] = useState(() => crypto.randomUUID());
  const failedContent = useRef<string | null>(null);
  const current = useRef(scene);
  current.current = scene;
  const [prepared, setPrepared] = useState(false);
  const [booted, setBooted] = useState<string | null>(null);
  const loadedInstance = useRef<string | null>(null);
  const currentInstance = useRef(instance);
  currentInstance.current = instance;
  const [error, setError] = useState<string | null>(null);
  const state: RuntimeState = {
    fonts: scene.fonts?.map(({ id, name, extension }) => ({ id, name, extension })),
    theme: scene.theme,
    title: scene.slide.title,
    body: scene.slide.body,
    reveal: scene.reveal,
    reveals: scene.slide.reveals,
    properties: scene.slide.scene?.properties ?? {},
    media: scene.slide.media ?? null,
    editing: !!scene.editing,
    pending: scene.customEditing?.pending ?? false,
    active: !still,
    autoplay: !still && !scene.editing,
    selectedLayer: scene.mediaEditing?.selected ? 'media' : (scene.customEditing?.selected ?? null),
    ...(still ? { probeFrame: 11 } : {}),
  };
  const content = JSON.stringify({
    theme: state.theme,
    properties: state.properties,
    title: state.title,
    body: state.body,
    reveal: state.reveal,
    reveals: state.reveals,
    media: state.media,
  });
  const currentContent = useRef(content);
  currentContent.current = content;
  const heartbeat = useSceneWatchdog(instance, prepared, error !== null, (message) => {
    failedContent.current = currentContent.current;
    if (document.activeElement === iframe.current)
      iframe.current?.parentElement?.focus({ preventScroll: true });
    setError(message);
    ready.current?.();
  });
  const latest = useRef(state);
  latest.current = state;
  const message = JSON.stringify({ type: 'prezi:update', state });
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.source !== iframe.current?.contentWindow) return;
      const parsed = runtimeEventSchema.safeParse(event.data);
      if (!parsed.success) return;
      const item = parsed.data;
      if (item.type === 'prezi:heartbeat') heartbeat();
      if (item.type === 'prezi:boot' && item.instance === currentInstance.current)
        setBooted(item.instance);
      if (item.type === 'prezi:status') {
        if (
          item.state === 'ready' &&
          item.reveal !== undefined &&
          item.reveal !== latest.current.reveal
        )
          return;
        if (item.state === 'error') failedContent.current = currentContent.current;
        setError(item.state === 'error' ? (item.message ?? 'The scene could not render.') : null);
        ready.current?.();
      }
      if (item.type === 'prezi:select') {
        if (item.layer === 'media') current.current.mediaEditing?.select();
        else current.current.customEditing?.select(item.layer);
      }
      if (item.type === 'prezi:frame') {
        if (item.layer === 'media') current.current.mediaEditing?.update(item.patch);
        else current.current.customEditing?.frame(item.layer, item.patch);
      }
      if (item.type === 'prezi:edit')
        current.current.customEditing?.update(item.property, item.value);
      if (item.type === 'prezi:key' && !current.current.editing)
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: item.key, repeat: item.repeat, bubbles: true }),
        );
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
    };
  }, [heartbeat]);
  useEffect(() => {
    if (error && failedContent.current !== content) {
      setPrepared(false);
      setError(null);
      setInstance(crypto.randomUUID());
    }
  }, [error, content]);
  useEffect(() => {
    if (prepared && !error)
      iframe.current?.contentWindow?.postMessage(
        { type: 'prezi:update', state: latest.current },
        '*',
      );
  }, [prepared, message, error]);
  useEffect(() => {
    const target = iframe.current?.contentWindow;
    if (!prepared || booted !== instance || loadedInstance.current === instance || !target || error)
      return;
    loadedInstance.current = instance;
    target.postMessage(
      {
        type: 'prezi:load',
        code: definition.code,
        definition: {
          id: definition.id,
          name: definition.name,
          fields: definition.fields,
          layers: definition.layers,
        },
        state: latest.current,
      },
      '*',
    );
  }, [prepared, booted, instance, definition, error]);
  return (
    <div
      tabIndex={-1}
      style={{ width: '100%', height: '100%', position: 'relative', outline: 'none' }}
    >
      {!error && (
        <iframe
          key={instance}
          ref={iframe}
          title="Custom scene"
          src={`prezi-scene://${instance}/index.html`}
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay"
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          onLoad={(event) => {
            const target = event.currentTarget;
            void window.prezi.prepareScene(instance).then((result) => {
              if (iframe.current !== target) return;
              if (!result.ok) {
                failedContent.current = currentContent.current;
                setError(result.error.message);
                ready.current?.();
                return;
              }
              setPrepared(true);
            });
          }}
        />
      )}
      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#101513',
            color: '#edf2ec',
            padding: 24,
            fontSize: 16,
          }}
        >
          {error}
          <p>Undo the last change or correct its source.</p>
          <button
            type="button"
            onClick={() => {
              setPrepared(false);
              setError(null);
              setInstance(crypto.randomUUID());
            }}
          >
            Restart scene
          </button>
        </div>
      )}
    </div>
  );
}
