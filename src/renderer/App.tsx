import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FolderOpen,
  LayoutPanelTop,
  Palette,
  Play,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { ProjectSnapshot } from '../shared/project';
import { useAppearance } from './appearance';
import { AppearancePanel } from './AppearancePanel';

export function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const { appearance, change, error: appearanceError } = useAppearance();
  useEffect(() => {
    const unsubscribe = window.prezi.subscribe(setSnapshot);
    void window.prezi.snapshot().then((result) => {
      if (result.ok) setSnapshot(result.value);
      else setError(result.error.message);
    });
    return unsubscribe;
  }, []);
  if (!snapshot)
    return (
      <main className="loading" role="status">
        {error ?? 'Opening your presentation desk…'}
      </main>
    );
  const slide =
    snapshot.project.slides.find((item) => item.id === selectedId) ?? snapshot.project.slides[0];
  if (!slide) return <main role="alert">The deck has no slides.</main>;
  const selectedIndex = snapshot.project.slides.findIndex((item) => item.id === slide.id);
  return (
    <div className="app-shell">
      <h1 className="sr-only">Your presentation desk</h1>
      <header className="app-header">
        <div className="brand">
          <span className="brand-symbol">
            <LayoutPanelTop size={20} />
          </span>
          <span>
            prezi<span className="brand-dot">.</span>
          </span>
          <span className="brand-caption">PRESENTATION DESK</span>
        </div>
        <div className="header-actions">
          <button type="button" disabled>
            <FolderOpen size={15} />
            Open
          </button>
          <button type="button" disabled>
            <Save size={15} />
            Save
          </button>
          <span className="toolbar-divider" />
          <button
            type="button"
            className="icon-button"
            aria-label="Appearance"
            title="Appearance"
            aria-expanded={appearanceOpen}
            onClick={() => {
              setAppearanceOpen(!appearanceOpen);
            }}
          >
            <Palette size={17} />
          </button>
          <button type="button" className="primary" disabled>
            <Play size={14} fill="currentColor" />
            Present
          </button>
        </div>
        {appearanceOpen && (
          <AppearancePanel
            appearance={appearance}
            change={change}
            close={() => {
              setAppearanceOpen(false);
            }}
          />
        )}
      </header>
      <div className="document-bar">
        <div>
          <span className="status-dot" />
          <strong>{snapshot.project.name}</strong>
          <span className="muted small">Local project</span>
        </div>
        <div className="history-controls">
          <button type="button" className="icon-button" aria-label="Undo" disabled>
            <Undo2 size={16} />
          </button>
          <button type="button" className="icon-button" aria-label="Redo" disabled>
            <Redo2 size={16} />
          </button>
        </div>
      </div>
      <aside className="slide-rail" aria-label="Slides">
        <div className="panel-heading">
          <span>
            Slides{' '}
            <span className="count">
              {snapshot.project.slides.length.toString().padStart(2, '0')}
            </span>
          </span>
          <button type="button" className="icon-button" aria-label="Add slide" disabled>
            <Plus size={16} />
          </button>
        </div>
        <ol className="slide-list">
          {snapshot.project.slides.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={`slide-card ${item.id === slide.id ? 'is-selected' : ''}`}
                aria-label={`Slide ${(index + 1).toString()}: ${item.title}`}
                aria-pressed={item.id === slide.id}
                onClick={() => {
                  setSelectedId(item.id);
                }}
              >
                <span className="slide-number">{(index + 1).toString().padStart(2, '0')}</span>
                <span className={`thumbnail thumbnail-${item.layout}`}>
                  <span className="mini-kicker">THE 0SMOSYS SHOW</span>
                  <strong>{item.title}</strong>
                  <span className="mini-rule" />
                </span>
                <span className="slide-card-title">{item.title}</span>
                <span className="slide-card-detail">
                  {item.layout === 'title' ? 'Title' : 'Text'} · {item.reveals.length} reveals
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
      <main className="workspace">
        <div className="canvas-heading">
          <span>SLIDE {(selectedIndex + 1).toString().padStart(2, '0')}</span>
          <span>
            1920 × 1080 <span className="muted">/</span> 16:9
          </span>
        </div>
        <div className="canvas-wrap">
          <article className={`slide-preview layout-${slide.layout}`} aria-label="Slide preview">
            <div className="scene-kicker">
              <span />
              THE 0SMOSYS SHOW
            </div>
            <div className="scene-text">
              <h2>{slide.title}</h2>
              <p>{slide.body}</p>
            </div>
            <div className="scene-footer">
              <span>NOTES FROM THE BUILD</span>
              <span>
                {(selectedIndex + 1).toString().padStart(2, '0')} /{' '}
                {snapshot.project.slides.length.toString().padStart(2, '0')}
              </span>
            </div>
          </article>
        </div>
        <div className="canvas-toolbar">
          <span className="muted small">Your canvas. Room to think.</span>
          <span className="zoom-label">FIT</span>
        </div>
        <section className="reveal-strip" aria-label="Reveal overview">
          <div>
            <span className="eyebrow">REVEAL STEPS</span>
            <p>One thought at a time.</p>
          </div>
          <div className="reveal-chips">
            <span className="reveal-chip active">
              00 <span>Initial state</span>
            </span>
            {slide.reveals.map((reveal, index) => (
              <span className="reveal-chip" key={reveal}>
                {(index + 1).toString().padStart(2, '0')} <span>{reveal.split(' / ')[0]}</span>
              </span>
            ))}
          </div>
        </section>
      </main>
      <aside className="inspector" aria-label="Slide properties">
        <div className="panel-heading">
          <span>Slide properties</span>
          <span className="small muted">{(selectedIndex + 1).toString().padStart(2, '0')}</span>
        </div>
        <div className="inspector-body">
          <div className="inspector-section">
            <span className="eyebrow">CONTENT</span>
            <label htmlFor="slide-title">Heading</label>
            <input id="slide-title" value={slide.title} readOnly />
            <label htmlFor="slide-body">Body</label>
            <textarea id="slide-body" value={slide.body} readOnly rows={5} />
            <label htmlFor="slide-layout">Layout</label>
            <select id="slide-layout" value={slide.layout} disabled>
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
            <textarea id="slide-reveals" value={slide.reveals.join('\n')} readOnly rows={6} />
            <span className="field-hint">Initial content is always visible.</span>
          </div>
          <div className="slide-actions">
            <button type="button" disabled>
              <Copy size={14} />
              Duplicate
            </button>
            <button type="button" className="icon-button" aria-label="Move slide up" disabled>
              <ArrowUp size={15} />
            </button>
            <button type="button" className="icon-button" aria-label="Move slide down" disabled>
              <ArrowDown size={15} />
            </button>
            <button type="button" className="icon-button danger" aria-label="Delete slide" disabled>
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
      <footer className="status-bar">
        <span>
          <span className="status-dot" />
          {error ?? appearanceError ?? 'Everything stays on this computer'}
        </span>
        <span>
          SLIDE {selectedIndex + 1} OF {snapshot.project.slides.length}
          <span className="status-separator">/</span>PREZI 0.1
        </span>
      </footer>
    </div>
  );
}
