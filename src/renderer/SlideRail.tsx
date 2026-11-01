import { Camera, Plus } from 'lucide-react';
import type { Project, Slide } from '../shared/project';
import { previewKey } from '../shared/preview';
import type { usePreviews } from './usePreviews';

interface Props {
  project: Project;
  previews: ReturnType<typeof usePreviews>;
  capture: () => void;
  slides: Slide[];
  selectedId: string;
  select: (id: string) => void;
  add: () => void;
}
export function SlideRail({
  project,
  previews,
  capture,
  slides,
  selectedId,
  select,
  add,
}: Props): React.JSX.Element {
  const { pending } = previews;
  return (
    <aside className="slide-rail" aria-label="Slides">
      <div className="panel-heading">
        <span>
          Slides <span className="count">{slides.length.toString().padStart(2, '0')}</span>
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Update selected thumbnail"
          title="Update selected thumbnail"
          disabled={Boolean(pending)}
          onClick={capture}
        >
          <Camera size={16} />
        </button>
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
      {pending && (
        <div className="preview-status" role="status">
          Capturing preview…{' '}
          <button
            type="button"
            onClick={() => {
              previews.cancel(pending.id);
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {previews.error && (
        <p className="preview-status" role="alert">
          {previews.error}
        </p>
      )}
      <ol className="slide-list">
        {slides.map((slide, index) => {
          const key = previewKey(project, slide);
          const image = [...previews.jobs]
            .reverse()
            .find((job) => job.slideId === slide.id && job.key === key && job.image)?.image;
          return (
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
                <span className="thumbnail">
                  {image ? (
                    <img
                      className="rendered-thumbnail"
                      src={image.dataUrl}
                      alt={`Rendered preview: ${slide.title}`}
                    />
                  ) : (
                    <>
                      <strong>{slide.title}</strong>
                      <span className="mini-rule" />
                    </>
                  )}
                </span>
                <span className="slide-card-title">{slide.title || 'Untitled slide'}</span>
                <span className="slide-card-detail">
                  {
                    { title: 'Title', content: 'Text', code: 'Code', process: 'Process' }[
                      slide.layout
                    ]
                  }{' '}
                  · {slide.reveals.length} reveals
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
