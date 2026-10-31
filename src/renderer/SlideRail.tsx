import { Plus } from 'lucide-react';
import type { Slide } from '../shared/project';

interface Props {
  slides: Slide[];
  selectedId: string;
  select: (id: string) => void;
  add: () => void;
}
export function SlideRail({ slides, selectedId, select, add }: Props): React.JSX.Element {
  return (
    <aside className="slide-rail" aria-label="Slides">
      <div className="panel-heading">
        <span>
          Slides <span className="count">{slides.length.toString().padStart(2, '0')}</span>
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Add slide"
          disabled={slides.length >= 200}
          onClick={add}
        >
          <Plus size={16} />
        </button>
      </div>
      <ol className="slide-list">
        {slides.map((slide, index) => (
          <li key={slide.id}>
            <button
              type="button"
              className={`slide-card ${slide.id === selectedId ? 'is-selected' : ''}`}
              aria-label={`Slide ${(index + 1).toString()}: ${slide.title}`}
              aria-pressed={slide.id === selectedId}
              onClick={() => {
                select(slide.id);
              }}
            >
              <span className="slide-number">{(index + 1).toString().padStart(2, '0')}</span>
              <span className={`thumbnail thumbnail-${slide.layout}`}>
                <span className="mini-kicker">THE 0SMOSYS SHOW</span>
                <strong>{slide.title}</strong>
                <span className="mini-rule" />
              </span>
              <span className="slide-card-title">{slide.title || 'Untitled slide'}</span>
              <span className="slide-card-detail">
                {slide.layout === 'title' ? 'Title' : 'Text'} · {slide.reveals.length} reveals
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="rail-footer">
        <span className="status-dot" />
        Made for your next explanation.
      </div>
    </aside>
  );
}
