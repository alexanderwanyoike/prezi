import { lazy, Suspense, useState } from 'react';
import { LayoutPanelTop, Palette, Play, Redo2, Undo2 } from 'lucide-react';
import { editPendingContext } from './edit-pending';
import { useProjectFonts } from './useProjectFonts';
import { PresentationThemeDialog } from './PresentationThemeDialog';
import { PresentationView } from './presentation/PresentationView';
import { SlideCanvas } from './presentation/SlideCanvas';
import { useUpdates } from './useUpdates';
import { UpdateDialog } from './UpdateDialog';
import { AgentConnection } from './AgentConnection';
import { MenuBar } from './menu/MenuBar';
import { WorkspaceTabs } from './WorkspaceTabs';
import { ProjectName } from './ProjectName';
import { useApplicationActions } from './useApplicationActions';
import { useWorkspaceSelection } from './useWorkspaceSelection';
import { useProject } from './useProject';
import { SlideRail } from './SlideRail';
import { SlideInspector } from './SlideInspector';
import { useAppearance } from './appearance';
import { AppearancePanel } from './AppearancePanel';

const CodeView = lazy(async () => {
  const module = await import('./source/CodeView');
  return { default: module.CodeView };
});

export function App(): React.JSX.Element {
  const project = useProject();
  const updates = useUpdates(project.flush);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const fontStatus = useProjectFonts(
    project.snapshot?.project.fonts,
    project.snapshot?.project.theme,
  );
  const { snapshot, error, busy, edit, undo, redo } = project;
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [codeVisible, setCodeVisible] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const { appearance, change, error: appearanceError } = useAppearance();
  const { actions, error: desktopError } = useApplicationActions({
    project,
    selectedId,
    setPresenting,
    setCodeVisible,
    setAppearanceOpen,
    setConnectionOpen,
    setUpdatesOpen,
    setThemeOpen,
  });
  const workspaceError = useWorkspaceSelection(
    snapshot,
    selectedId,
    selectedField,
    setSelectedId,
    setSelectedField,
  );
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
  const editor = (
    <div className="app-shell">
      {themeOpen && (
        <PresentationThemeDialog
          value={snapshot.project.theme}
          fonts={snapshot.project.fonts ?? []}
          importFont={project.importFont}
          replaceFont={project.replaceFont}
          updateFont={(fontId, patch) => {
            edit([{ type: 'updateFont', fontId, patch }], 'Edit font credits');
          }}
          change={(patch) => {
            edit([{ type: 'setTheme', patch }], 'Change presentation theme');
          }}
          close={() => {
            setThemeOpen(false);
          }}
        />
      )}
      {updatesOpen && (
        <UpdateDialog
          updates={updates}
          close={() => {
            setUpdatesOpen(false);
          }}
        />
      )}
      {connectionOpen && (
        <AgentConnection
          close={() => {
            setConnectionOpen(false);
          }}
        />
      )}
      <h1 className="sr-only">Your presentation desk</h1>
      <header className="app-header">
        <div className="application-navigation">
          <div className="brand">
            <span className="brand-symbol">
              <LayoutPanelTop size={20} />
            </span>
            <span>
              prezi<span className="brand-dot">.</span>
            </span>
          </div>
          <MenuBar
            actions={actions}
            code={codeVisible}
            undoLabel={snapshot.undoLabel}
            redoLabel={snapshot.redoLabel}
            canUndo={snapshot.canUndo}
            canRedo={snapshot.canRedo}
          />
        </div>
        <div className="header-actions">
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
            title={snapshot.undoLabel ? `Undo: ${snapshot.undoLabel}` : 'Undo'}
            disabled={!snapshot.canUndo}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Redo"
            title={snapshot.redoLabel ? `Redo: ${snapshot.redoLabel}` : 'Redo'}
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
      <section className="workspace-area" aria-label="Slide workspace">
        <WorkspaceTabs code={codeVisible} select={setCodeVisible} />
        <div
          id="workspace-panel"
          className="workspace-panel"
          role="tabpanel"
          aria-labelledby={codeVisible ? 'code-tab' : 'canvas-tab'}
        >
          {codeVisible ? (
            <Suspense
              fallback={
                <main className="workspace" role="status">
                  Opening scene source…
                </main>
              }
            >
              <CodeView
                key={`${slide.id}:${slide.scene?.definitionId ?? 'built-in'}`}
                project={snapshot.project}
                slide={slide}
                pending={busy}
                edit={edit}
                flush={project.flush}
              />
            </Suspense>
          ) : (
            <SlideCanvas
              theme={snapshot.project.theme}
              fonts={snapshot.project.fonts}
              definition={snapshot.project.scenes?.[slide.scene?.definitionId ?? '']}
              customEditing={{
                selected: selectedField?.startsWith('layer/') ? selectedField.slice(6) : null,
                pending: busy,
                select: (id) => {
                  setSelectedField(`layer/${id}`);
                },
                update: (property, value) => {
                  edit(
                    [
                      {
                        type: 'updateSceneProperties',
                        slideId: slide.id,
                        patch: { [property]: value },
                      },
                    ],
                    'Edit scene text',
                  );
                },
              }}
              pending={selectionPending}
              editing={{
                pending: busy,
                selected:
                  selectedField === 'title' || selectedField === 'body' || selectedField === 'code'
                    ? selectedField
                    : null,
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
          )}
        </div>
      </section>
      <SlideInspector
        definition={snapshot.project.scenes?.[slide.scene?.definitionId ?? '']}
        updateCustom={(property, value) => {
          edit(
            [{ type: 'updateSceneProperties', slideId: slide.id, patch: { [property]: value } }],
            'Edit scene properties',
          );
        }}
        pending={selectionPending}
        replaceMedia={() => {
          project.replaceMedia(slide.id);
        }}
        updateMedia={(patch) => {
          edit([{ type: 'updateMedia', slideId: slide.id, patch }], 'Configure media');
        }}
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
          <span role={error || desktopError || fontStatus.error ? 'alert' : undefined}>
            {error ??
              desktopError ??
              fontStatus.error ??
              workspaceError ??
              appearanceError ??
              status}
          </span>
        </span>
        {['available', 'ready'].includes(updates.snapshot?.state.stage ?? '') && (
          <button
            type="button"
            className="update-notice"
            onClick={() => {
              setUpdatesOpen(true);
            }}
          >
            Update {updates.snapshot?.state.stage === 'ready' ? 'ready' : 'available'}
          </button>
        )}
        <span>
          SLIDE {selectedIndex + 1} OF {snapshot.project.slides.length}
          <span className="status-separator">/</span>PREZI{' '}
          {updates.snapshot?.installedVersion ?? '…'}
        </span>
      </footer>
    </div>
  );
  return <editPendingContext.Provider value={busy}>{editor}</editPendingContext.Provider>;
}
