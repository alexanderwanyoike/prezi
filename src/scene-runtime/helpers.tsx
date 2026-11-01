import type { CSSProperties, ReactNode } from 'react';
import { FrameEditor } from '../renderer/presentation/FrameEditor';
import type { Frame, FrameLimits } from '../renderer/presentation/FrameEditor';
import { useScene } from './context';
import { EditableText } from './EditableText';
import { SceneMedia } from '../renderer/presentation/SceneMedia';

export function Layer({
  id,
  children,
  style,
}: {
  id: string;
  children?: ReactNode;
  style?: CSSProperties;
}): React.JSX.Element {
  const { definition, state, emit } = useScene();
  const layer = definition.layers.find((item) => item.id === id);
  if (layer?.frame) {
    const frame: Frame = { x: 0, y: 0, width: 0, height: 0 };
    const limits: FrameLimits = {};
    (['x', 'y', 'width', 'height'] as const).forEach((axis) => {
      const property = layer.frame?.[axis];
      if (!property) return;
      const field = definition.fields[property];
      const value = state.properties[property] ?? field?.default;
      frame[axis] = typeof value === 'number' ? value : 0;
      if (field?.type === 'number')
        limits[axis] = {
          ...(field.min !== undefined ? { min: field.min } : {}),
          ...(field.max !== undefined ? { max: field.max } : {}),
        };
    });
    return (
      <FrameEditor
        frame={frame}
        limits={limits}
        label={layer.label}
        layerId={id}
        style={style}
        editing={
          state.editing
            ? {
                selected: state.selectedLayer === id,
                pending: state.pending,
                select: () => {
                  emit({ type: 'prezi:select', layer: id });
                },
                update: (patch) => {
                  emit({ type: 'prezi:frame', layer: id, patch });
                },
              }
            : undefined
        }
      >
        {children}
      </FrameEditor>
    );
  }
  return (
    <div
      data-layer={id}
      data-selected={state.editing && state.selectedLayer === id}
      style={{
        ...style,
        outline: state.editing && state.selectedLayer === id ? '2px solid #00d970' : undefined,
        outlineOffset: 6,
      }}
    >
      {children}
    </div>
  );
}
export function Text({
  property,
  layer,
  style,
}: {
  property: string;
  layer?: string;
  style?: CSSProperties;
}): React.JSX.Element {
  const { definition, state, emit } = useScene();
  const field = definition.fields[property];
  const value = state.properties[property] ?? field?.default ?? '';
  const selected =
    definition.layers.find((item) => item.id === layer) ??
    definition.layers.find((item) => item.property === property);
  if (state.editing && field?.type === 'text')
    return (
      <span data-layer={selected?.id}>
        <EditableText
          value={String(value)}
          label={selected?.label ?? field.label}
          style={style}
          multiline={field.multiline ?? false}
          pending={state.pending}
          update={(text) => {
            emit({ type: 'prezi:edit', property, value: text });
          }}
        />
      </span>
    );
  return <span style={style}>{String(value)}</span>;
}
export function Media(): React.JSX.Element | null {
  const { state, emit } = useScene();
  return state.media ? (
    <SceneMedia
      key={state.media.id}
      editing={
        state.editing
          ? {
              selected: state.selectedLayer === 'media',
              pending: state.pending,
              select: () => {
                emit({ type: 'prezi:select', layer: 'media' });
              },
              update: (patch) => {
                emit({ type: 'prezi:frame', layer: 'media', patch });
              },
            }
          : undefined
      }
      media={state.media}
      active={state.active}
      autoplay={state.autoplay}
    />
  ) : null;
}
