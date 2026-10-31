import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { MediaInspector } from './MediaInspector';
import { EditableText } from './EditableText';
import type { Slide } from '../shared/project';
import { textLayers } from '../shared/text-scene';
import type { TextField } from '../shared/text-scene';

interface Props {
  slide: Slide;
  pending: boolean;
  selectedField: TextField | null;
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
  selectField,
  index,
  count,

  update,
  duplicate,
  remove,
  move,
}: Props): React.JSX.Element {
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
          <span className="eyebrow">
            {selectedField === null
              ? 'CONTENT'
              : `SELECTED / ${selectedField === 'title' ? 'HEADING' : 'BODY'}`}
          </span>
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
          <label htmlFor="slide-layout">Layout</label>
          <select
            id="slide-layout"
            value={slide.layout}

            onChange={(event) => {
              update({ layout: event.target.value === 'title' ? 'title' : 'content' });
            }}
          >
            <option value="title">Title / chapter</option>
            <option value="content">Text / reveals</option>
          </select>
        </div>
        {slide.media && (
          <MediaInspector
            media={slide.media}
            remove={() => {
              update({ media: null });
            }}
          />
        )}
        <div className="inspector-section">
          <span className="eyebrow">PROGRESSION</span>
          <p className="muted small">
            Reveals appear when you advance. Nothing moves on without you.
          </p>
          <label htmlFor="slide-reveals">
            Reveal text <span className="muted">one per line</span>
          </label>
          <EditableText
            id="slide-reveals"
            value={slide.reveals.join('\n')}
            rows={6}
            commit={(text) => {
              update({ reveals: text.split('\n').filter((line) => line.trim().length > 0) });
            }}
          />
          <span className="field-hint">Up to 30 steps. Initial content is always visible.</span>
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
      <div className="inspector-note">
        <span className="eyebrow">A QUIET STAGE</span>
        <p>
          The story is yours.
          <br />
          The space around it is intentional.
        </p>
      </div>
    </aside>
  );
}
