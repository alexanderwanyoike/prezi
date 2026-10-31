import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import type { Slide } from '../shared/project';

interface Props {
  slide: Slide;
  index: number;
  count: number;
  busy: boolean;
  update: (patch: Partial<Omit<Slide, 'id'>>) => void;
  duplicate: () => void;
  remove: () => void;
  move: (index: number) => void;
}
export function SlideInspector({
  slide,
  index,
  count,
  busy,
  update,
  duplicate,
  remove,
  move,
}: Props): React.JSX.Element {
  const [draft, setDraft] = useState(slide);
  const [reveals, setReveals] = useState(slide.reveals.join('\n'));
  useEffect(() => {
    setDraft(slide);
    setReveals(slide.reveals.join('\n'));
  }, [slide]);
  return (
    <aside className="inspector" aria-label="Slide properties">
      <div className="panel-heading">
        <span>Slide properties</span>
        <span className="small muted">{(index + 1).toString().padStart(2, '0')}</span>
      </div>
      <div className="inspector-body">
        <div className="inspector-section">
          <span className="eyebrow">CONTENT</span>
          <label htmlFor="slide-title">Heading</label>
          <input
            id="slide-title"
            value={draft.title}
            maxLength={200}
            onChange={(event) => {
              setDraft({ ...draft, title: event.target.value });
            }}
            onBlur={() => {
              if (draft.title !== slide.title) update({ title: draft.title });
            }}
          />
          <label htmlFor="slide-body">Body</label>
          <textarea
            id="slide-body"
            value={draft.body}
            maxLength={10000}
            rows={5}
            onChange={(event) => {
              setDraft({ ...draft, body: event.target.value });
            }}
            onBlur={() => {
              if (draft.body !== slide.body) update({ body: draft.body });
            }}
          />
          <label htmlFor="slide-layout">Layout</label>
          <select
            id="slide-layout"
            value={slide.layout}
            disabled={busy}
            onChange={(event) => {
              update({ layout: event.target.value === 'title' ? 'title' : 'content' });
            }}
          >
            <option value="title">Title / chapter</option>
            <option value="content">Text / reveals</option>
          </select>
        </div>
        <div className="inspector-section">
          <span className="eyebrow">PROGRESSION</span>
          <p className="muted small">
            Reveals appear when you advance. Nothing moves on without you.
          </p>
          <label htmlFor="slide-reveals">
            Reveal text <span className="muted">one per line</span>
          </label>
          <textarea
            id="slide-reveals"
            value={reveals}
            rows={6}
            onChange={(event) => {
              setReveals(event.target.value);
            }}
            onBlur={() => {
              if (reveals !== slide.reveals.join('\n'))
                update({ reveals: reveals.split('\n').filter((text) => text.trim().length > 0) });
            }}
          />
          <span className="field-hint">Up to 30 steps. Initial content is always visible.</span>
        </div>
        <div className="slide-actions">
          <button type="button" disabled={busy || count >= 200} onClick={duplicate}>
            <Copy size={14} />
            Duplicate
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Move slide up"
            disabled={busy || index === 0}
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
            disabled={busy || index === count - 1}
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
            disabled={busy || count === 1}
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
