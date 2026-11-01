import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { CustomSceneInspector } from './CustomSceneInspector';
import type { CustomSceneDefinition, SceneValues } from '../shared/scene-definition';
import { MediaInspector } from './MediaInspector';
import { EditableText } from './EditableText';
import type { MediaPatch } from '../shared/media';
import type { Slide } from '../shared/project';
import { textLayers } from '../shared/text-scene';
import type { TextField } from '../shared/text-scene';

interface Props {
  slide: Slide;
  pending: boolean;
  updateMedia: (patch: MediaPatch) => void;
  replaceMedia: () => void;
  selectedField: string | null;
  definition?: CustomSceneDefinition | undefined;
  updateCustom: (property: string, value: SceneValues[string]) => void;
  selectField: (field: TextField) => void;
  index: number;
  count: number;
  update: (patch: Partial<Omit<Slide, 'id'>>) => void;
  duplicate: () => void;
  remove: () => void;
  move: (index: number) => void;
}
export function SlideInspector({
  slide,
  pending,
  selectedField,
  definition,
  updateCustom,
  selectField,
  index,
  count,

  update,
  updateMedia,
  replaceMedia,
  duplicate,
  remove,
  move,
}: Props): React.JSX.Element {
  let sectionLabel = 'CONTENT';
  if (definition) sectionLabel = 'CUSTOM SCENE';
  else if (selectedField)
    sectionLabel = `SELECTED / ${selectedField === 'title' ? 'HEADING' : selectedField.toUpperCase()}`;
  if (pending)
    return <aside className="inspector" aria-label="Slide properties" aria-busy="true" />;
  return (
    <aside className="inspector" aria-label="Slide properties">
      <div className="panel-heading">
        <span>Slide properties</span>
        <span className="small muted">{(index + 1).toString().padStart(2, '0')}</span>
      </div>
      <div className="inspector-body">
        <div className="inspector-section">
          <span className="eyebrow">{sectionLabel}</span>
          {definition && slide.scene ? (
            <CustomSceneInspector
              definition={definition}
              properties={slide.scene.properties}
              update={updateCustom}
            />
          ) : (
            <>
              <label htmlFor="slide-title">Heading</label>
              <EditableText
                onFocus={() => {
                  selectField('title');
                }}
                id="slide-title"
                value={slide.title}
                maxLength={textLayers.title.maxLength}
                commit={(title) => {
                  update({ title });
                }}
              />
              <label htmlFor="slide-body">Body</label>
              <EditableText
                onFocus={() => {
                  selectField('body');
                }}
                id="slide-body"
                value={slide.body}
                maxLength={textLayers.body.maxLength}
                rows={5}
                commit={(body) => {
                  update({ body });
                }}
              />
            </>
          )}
          <label htmlFor="slide-layout">Layout</label>
          <select
            id="slide-layout"
            value={definition ? 'custom' : slide.layout}

            onChange={(event) => {
              if (event.target.value !== 'custom')
                update({
                  layout:
                    (['title', 'content', 'code', 'process'] as const).find(
                      (layout) => layout === event.target.value,
                    ) ?? 'content',
                  scene: null,
                  ...(event.target.value === 'process'
                    ? {
                        reveals: slide.reveals.length
                          ? slide.reveals.slice(0, 6)
                          : ['Planning', 'Implementation', 'Review', 'Human testing'],
                      }
                    : {}),
                });
            }}
          >
            {definition && <option value="custom">Custom / {definition.name}</option>}
            <option value="title">Title / chapter</option>
            <option value="content">Text / reveals</option>
            <option value="code">Code explanation</option>
            <option value="process">Process / workflow</option>
          </select>
        </div>
        {!definition && slide.layout === 'code' && (
          <div className="inspector-section">
            <label htmlFor="slide-code">Code block</label>
            <EditableText
              id="slide-code"
              value={slide.code ?? ''}
              rows={10}
              onFocus={() => {
                selectField('code');
              }}
              maxLength={16000}
              commit={(code) => {
                update({ code });
              }}
            />
          </div>
        )}
        {slide.media && (
          <MediaInspector
            media={slide.media}
            locate={replaceMedia}
            update={updateMedia}
            remove={() => {
              update({ media: null });
            }}
          />
        )}
        <div className="inspector-section">
          <span className="eyebrow">PROGRESSION</span>
          <p className="muted small">Reveals appear when you advance.</p>
          <label htmlFor="slide-reveals">
            Reveal text <span className="muted">one per line</span>
          </label>
          <EditableText
            id="slide-reveals"
            value={slide.reveals.join('\n')}
            rows={6}
            commit={(text) => {
              update({
                reveals: text
                  .split('\n')
                  .filter((line) => line.trim().length > 0)
                  .slice(0, slide.layout === 'process' ? 6 : 30),
              });
            }}
          />
          <span className="field-hint">
            {slide.layout === 'process'
              ? 'Up to six diagram stages.'
              : 'Up to 30 steps. Initial content is always visible.'}
          </span>
        </div>
        <div className="slide-actions">
          <button type="button" disabled={count >= 200} onClick={duplicate}>
            <Copy size={14} />
            Duplicate
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Move slide up"
            disabled={index === 0}
            onClick={() => {
              move(index - 1);
            }}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Move slide down"
            disabled={index === count - 1}
            onClick={() => {
              move(index + 1);
            }}
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            className="icon-button danger"
            aria-label="Delete slide"
            disabled={count === 1}
            onClick={remove}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
