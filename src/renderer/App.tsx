import { useState } from 'react';
import {
  FilePlus2,
  ImagePlus,
  FolderOpen,
  LayoutPanelTop,
  Palette,
  Play,
  Redo2,
  Save,
  Undo2,
} from 'lucide-react';
import { PresentationView } from './presentation/PresentationView';
import { SlideCanvas } from './presentation/SlideCanvas';
import { ProjectName } from './ProjectName';
import { useProject } from './useProject';
import { SlideRail } from './SlideRail';
import { SlideInspector } from './SlideInspector';
import { useAppearance } from './appearance';
import { AppearancePanel } from './AppearancePanel';
import type { TextField } from '../shared/text-scene';

export function App(): React.JSX.Element {
  const { snapshot, error, busy, edit, undo, redo, save, open, newProject, importMedia } =
    useProject();
  const [selectedField, setSelectedField] = useState<TextField | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const { appearance, change, error: appearanceError } = useAppearance();
  if (!snapshot)
    return (
      <main className="loading" role="status">
        {error ?? 'Opening your presentation desk…'}
      </main>
    );
  const slide =
    snapshot.project.slides.find((item) => item.id === selectedId) ?? snapshot.project.slides[0];
  if (!slide) return <main role="alert">The deck has no slides.</main>;
  if (presenting)
    return (
      <PresentationView
        project={snapshot.project}
        exit={() => {
          setPresenting(false);
        }}
      />
    );
  const selectionPending =
    busy && selectedId !== null && !snapshot.project.slides.some((item) => item.id === selectedId);
  const selectedIndex = snapshot.project.slides.findIndex((item) => item.id === slide.id);
  let status = snapshot.filePath ? 'Saved on this computer' : 'Not saved yet';
  if (snapshot.dirty) status = 'Unsaved changes';
  if (busy) status = 'Updating the deck…';
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
          <button
            type="button"
            className="icon-button"
            aria-label="New presentation"
            title="New presentation"

            onClick={newProject}
          >
            <FilePlus2 size={17} />
          </button>
          <button type="button" onClick={open}>
            <FolderOpen size={15} />
            Open
          </button>
          <button
            type="button"

            onClick={() => {
              save();
            }}
          >
            <Save size={15} />
            Save
          </button>
          <button
            type="button"

            onClick={() => {
              save(true);
            }}
          >
            Save as
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              importMedia(slide.id);
            }}
          >
            <ImagePlus size={15} />
            Import media
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
          <button
            type="button"
            className="primary"
            onClick={() => {
              setAppearanceOpen(false);
              setPresenting(true);
            }}
          >
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
          <ProjectName
            key={snapshot.project.id}
            name={snapshot.project.name}
            rename={(name) => {
              edit([{ type: 'renameProject', name }], 'Rename presentation');
            }}
          />
          <span className="muted small">Local project</span>
        </div>
        <div className="history-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Undo"
            disabled={!snapshot.canUndo}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Redo"
            disabled={!snapshot.canRedo}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>
      <SlideRail
        slides={snapshot.project.slides}
        selectedId={slide.id}
        select={setSelectedId}
        add={() => {
          const id = crypto.randomUUID();
          edit(
            [
              {
                type: 'addSlide',
                slide: { id, title: 'Untitled slide', body: '', layout: 'content', reveals: [] },
                index: selectedIndex + 1,
              },
            ],
            'Add slide',
          );
          setSelectedId(id);
        }}
      />
      <SlideCanvas
        pending={selectionPending}
        editing={{
          selected: selectedField,
          select: setSelectedField,
          update: (field, value) => {
            edit(
              [{ type: 'updateSlide', slideId: slide.id, patch: { [field]: value } }],
              'Edit scene text',
            );
          },
        }}
        key={`canvas:${slide.id}`}
        slide={slide}
        index={selectedIndex}
        count={snapshot.project.slides.length}
      />
      <SlideInspector
        pending={selectionPending}
        selectedField={selectedField}
        selectField={setSelectedField}
        key={`inspector:${slide.id}`}
        slide={slide}
        index={selectedIndex}
        count={snapshot.project.slides.length}
        update={(patch) => {
          edit([{ type: 'updateSlide', slideId: slide.id, patch }], 'Edit slide');
        }}
        duplicate={() => {
          const newId = crypto.randomUUID();
          edit([{ type: 'duplicateSlide', slideId: slide.id, newId }], 'Duplicate slide');
          setSelectedId(newId);
        }}
        remove={() => {
          edit([{ type: 'deleteSlide', slideId: slide.id }], 'Delete slide');
          setSelectedId(snapshot.project.slides[Math.max(0, selectedIndex - 1)]?.id ?? null);
        }}
        move={(index) => {
          edit([{ type: 'moveSlide', slideId: slide.id, index }], 'Move slide');
        }}
      />
      <footer className="status-bar">
        <span>
          <span className="status-dot" />
          <span role={error ? 'alert' : undefined}>{error ?? appearanceError ?? status}</span>
        </span>
        <span>
          SLIDE {selectedIndex + 1} OF {snapshot.project.slides.length}
          <span className="status-separator">/</span>PREZI 0.1
        </span>
      </footer>
    </div>
  );
}
