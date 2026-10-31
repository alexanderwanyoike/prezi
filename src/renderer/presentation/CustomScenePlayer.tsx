import { useEffect, useRef, useState } from 'react';
import type { CustomSceneDefinition, SceneValues } from '../../shared/scene-definition';
import { runtimeEventSchema } from '../../shared/scene-runtime';
import type { RuntimeState } from '../../shared/scene-runtime';
import type { SceneProps } from './SlideScene';

export interface CustomSceneEditing {
  selected: string | null;
  pending: boolean;
  select: (layer: string) => void;
  update: (property: string, value: SceneValues[string]) => void;
}
export function CustomScenePlayer({
  scene,
  definition,
  still,
}: {
  scene: SceneProps;
  definition: CustomSceneDefinition;
  still: boolean;
}): React.JSX.Element {
  const iframe = useRef<HTMLIFrameElement>(null);
  const instance = useRef(crypto.randomUUID());
  const current = useRef(scene);
  current.current = scene;
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state: RuntimeState = {
    title: scene.slide.title,
    body: scene.slide.body,
    reveal: scene.reveal,
    properties: scene.slide.scene?.properties ?? {},
    media: scene.slide.media ?? null,
    editing: !!scene.editing,
    pending: scene.customEditing?.pending ?? false,
    active: !still,
    autoplay: !still && !scene.editing,
    selectedLayer: scene.customEditing?.selected ?? null,
    ...(still ? { probeFrame: 11 } : {}),
  };
  const latest = useRef(state);
  latest.current = state;
  const message = JSON.stringify({ type: 'prezi:update', state });
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.source !== iframe.current?.contentWindow) return;
      const parsed = runtimeEventSchema.safeParse(event.data);
      if (!parsed.success) return;
      const item = parsed.data;
      if (item.type === 'prezi:status') {
        setError(item.state === 'error' ? (item.message ?? 'The scene could not render.') : null);
      }
      if (item.type === 'prezi:select') current.current.customEditing?.select(item.layer);
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
  }, []);
  useEffect(() => {
    if (prepared)
      iframe.current?.contentWindow?.postMessage(
        { type: 'prezi:update', state: latest.current },
        '*',
      );
  }, [prepared, message]);
  return (
    <div style={{ width: 1920, height: 1080, position: 'relative' }}>
      <iframe
        ref={iframe}
        title="Custom scene"
        src={`prezi-scene://${instance.current}/index.html`}
        sandbox="allow-scripts allow-same-origin"
        allow="autoplay"
        style={{ width: 1920, height: 1080, border: 0, display: 'block' }}
        onLoad={() => {
          void window.prezi.prepareScene(instance.current).then((result) => {
            if (!iframe.current) return;
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            iframe.current.contentWindow?.postMessage(
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
            setPrepared(true);
          });
        }}
      />
      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#101513',
            color: '#edf2ec',
            padding: 128,
            fontSize: 36,
          }}
        >
          {error}
          <p>Undo the last change or correct its source.</p>
        </div>
      )}
    </div>
  );
}
