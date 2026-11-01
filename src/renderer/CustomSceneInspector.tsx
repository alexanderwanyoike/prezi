import type { CustomSceneDefinition, SceneValues } from '../shared/scene-definition';
import { EditableText } from './EditableText';
import { NumberField } from './NumberField';
import { CheckboxField } from './CheckboxField';

export function CustomSceneInspector({
  definition,
  properties,
  update,
  heading = 'SCENE',
}: {
  definition: Pick<CustomSceneDefinition, 'name' | 'fields'>;
  properties: SceneValues;
  update: (property: string, value: SceneValues[string]) => void;
  heading?: string;
}): React.JSX.Element {
  return (
    <div className="inspector-section">
      <span className="eyebrow">
        {heading.toLowerCase() === definition.name.toLowerCase()
          ? heading
          : `${heading} / ${definition.name}`}
      </span>
      {Object.entries(definition.fields).map(([name, field]) => {
        const value = properties[name] ?? field.default;
        if (field.type === 'boolean')
          return (
            <CheckboxField
              key={name}
              label={field.label}
              value={typeof value === 'boolean' ? value : field.default}
              change={(next) => {
                update(name, next);
              }}
            />
          );
        if (field.type === 'number')
          return (
            <NumberField
              key={name}
              label={field.label}
              value={typeof value === 'number' ? value : field.default}
              min={field.min ?? -100000}
              max={field.max ?? 100000}
              change={(next) => {
                update(name, next);
              }}
            />
          );
        const id = `scene-property-${name}`;
        return (
          <div key={name}>
            <label htmlFor={id}>{field.label}</label>
            {field.type === 'color' ? (
              <input
                id={id}
                type="color"
                value={String(value)}
                onChange={(event) => {
                  update(name, event.target.value);
                }}
              />
            ) : (
              <EditableText
                id={id}
                value={String(value)}
                rows={field.multiline ? 3 : undefined}
                maxLength={10000}
                commit={(next) => {
                  update(name, next);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
