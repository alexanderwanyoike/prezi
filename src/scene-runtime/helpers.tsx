import type { CSSProperties, ReactNode } from 'react';
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
  const { definition, state } = useScene();
  const layer = definition.layers.find((item) => item.id === id);
  const frame: CSSProperties = {};
  if (layer?.frame) {
    const number = (property: string): number => {
      const value = state.properties[property] ?? definition.fields[property]?.default;
      return typeof value === 'number' ? value : 0;
    };
    Object.assign(frame, {
      position: 'absolute',
      left: number(layer.frame.x),
      top: number(layer.frame.y),
      width: number(layer.frame.width),
      height: number(layer.frame.height),
    });
  }
  return (
    <div
      data-layer={id}
      data-selected={state.editing && state.selectedLayer === id}
      style={{
        ...frame,
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
  const { state } = useScene();
  return state.media ? (
    <SceneMedia media={state.media} active={state.active} autoplay={state.autoplay} />
  ) : null;
}
