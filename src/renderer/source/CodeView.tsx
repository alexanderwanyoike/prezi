import { useState } from 'react';
import type { ReactNode } from 'react';
import { Braces, FileCode2, Plus, Trash2 } from 'lucide-react';
import { useReferenceSources } from './useReferenceSources';
import { CodeResourceTabs } from './CodeResourceTabs';
import type { CodeResource } from './CodeResourceTabs';
import { TransitionCodeView } from './TransitionCodeView';
import type { EditOperation, Project, Slide } from '../../shared/project';
import { projectSources } from '../../shared/project-sources';
import { withoutSceneDraft } from '../../shared/scene-draft';
import { scenePathSchema } from '../../shared/custom-scene';
import { SourceCode } from './SourceCode';
import { useSceneDraft } from './useSceneDraft';
import { SceneJobFeedback } from './SceneJobFeedback';

interface CodeViewProps {
  project: Project;
  slide: Slide;
  pending: boolean;
  edit: (operations: EditOperation[], label: string) => void;
  flush: () => Promise<void>;
}
function SceneCodeView({
  project,
  slide,
  pending,
  edit,
  flush,
  tabs,
  referenceSources,
}: CodeViewProps & {
  tabs: ReactNode;
  referenceSources: Record<string, string>;
}): React.JSX.Element {
  const editor = useSceneDraft(project, slide, pending, edit, flush);
  const { draft } = editor;
  const definition = project.scenes?.[slide.scene?.definitionId ?? ''];
  const prefix = `drafts/${slide.id}/`;
  let preferred = 'renderer/presentation/SlideScene.tsx';
  if (definition) preferred = `scenes/${definition.id}/source/${definition.source.entry}`;
  if (draft) preferred = `${prefix}source/${draft.entry}`;
  const [selected, setSelected] = useState<string | null>(preferred);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const sources = projectSources({
    ...project,
    sources: referenceSources,
    drafts: draft
      ? { ...project.drafts, [slide.id]: draft }
      : withoutSceneDraft(project.drafts, slide.id),
  });
  const priority = (path: string): number => {
    if (path.startsWith(prefix)) return 0;
    if (definition && path.startsWith(`scenes/${definition.id}/`)) return 1;
    return 2;
  };
  const paths = Object.keys(sources).sort(
    (left, right) => priority(left) - priority(right) || left.localeCompare(right),
  );
  let name = 'slide-properties.json';
  let source = JSON.stringify(slide, null, 2);
  if (selected !== null) {
    name = sources[selected] !== undefined ? selected : preferred;
    source = sources[name] ?? 'No source is stored in this project.';
  }
  const editable = !!draft && name.startsWith(prefix);
  const metadata = name === `${prefix}definition.json`;
  const sourceName = editable && !metadata ? name.slice(`${prefix}source/`.length) : null;
  return (
    <main
      className="workspace source-workspace"
      id="code-resource-panel"
      role="tabpanel"
      aria-labelledby="code-scene-tab"
    >
      <div className="canvas-heading">
        {tabs}
        <div className="source-commands">
          {!draft && (
            <button
              type="button"
              onClick={() => {
                const next = editor.create();
                setSelected(`${prefix}source/${next.entry}`);
              }}
            >
              {definition ? 'Edit scene code' : 'Create custom scene'}
            </button>
          )}
          {draft && (
            <>
              <span>{pending ? 'Saving draft…' : 'DRAFT / SAVED IN PROJECT'}</span>
              <button
                type="button"
                disabled={pending || editor.active || editor.conflict}
                onClick={() => {
                  void editor.apply();
                }}
              >
                Apply scene code
              </button>
              {editor.conflict && (
                <button
                  type="button"
                  disabled={pending || editor.active}
                  onClick={() => {
                    void editor.apply(true);
                  }}
                >
                  Apply draft anyway
                </button>
              )}
              <button
                type="button"
                disabled={editor.active}
                onClick={() => {
                  editor.discard();
                  setSelected(null);
                }}
              >
                Discard draft
              </button>
            </>
          )}
          {editor.active && (
            <button type="button" onClick={editor.cancel}>
              Cancel job
            </button>
          )}
        </div>
      </div>
      <div className="source-browser">
        <nav className="source-files" aria-label="Scene source files">
          <span className="eyebrow">INSTANCE</span>
          <button
            type="button"
            aria-pressed={selected === null}
            onClick={() => {
              setSelected(null);
            }}
          >
            <Braces size={14} />
            <span>Slide properties</span>
          </button>
          <span className="eyebrow">{draft ? 'DRAFT / SOURCE' : 'REMOTION / SCENES'}</span>
          {draft && (
            <button
              type="button"
              onClick={() => {
                setAdding(!adding);
              }}
            >
              <Plus size={14} />
              Add source file
            </button>
          )}
          {adding && (
            <form
              className="source-new-file"
              onSubmit={(event) => {
                event.preventDefault();
                const parsed = scenePathSchema.safeParse(newName);
                if (!parsed.success) {
                  setFileError('Use a TSX, TS or JSON scene filename.');
                  return;
                }
                if (draft?.files[parsed.data] !== undefined) {
                  setFileError('That file already exists.');
                  return;
                }
                editor.changeFile(parsed.data, '');
                setSelected(`${prefix}source/${parsed.data}`);
                setAdding(false);
                setNewName('');
                setFileError(null);
              }}
            >
              <label htmlFor="new-scene-file">Filename</label>
              <input
                id="new-scene-file"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                }}
              />
              <button type="submit">Add file</button>
              {fileError && <span role="alert">{fileError}</span>}
            </form>
          )}
          {paths.map((path) => (
            <button
              type="button"
              key={path}
              aria-label={path}
              title={path}
              aria-pressed={selected !== null && path === name}
              onClick={() => {
                setSelected(path);
              }}
            >
              <FileCode2 size={14} />
              <span>
                {path.split('/').at(-1)}
                <small>{path.slice(0, path.lastIndexOf('/'))}</small>
              </span>
            </button>
          ))}
        </nav>
        <section className="source-document" aria-label="Selected source file">
          <div className="source-file-heading">
            <span>{name}</span>
            <span>
              {editable ? 'EDITABLE' : 'READ ONLY'} / {source.split('\n').length} lines
            </span>
            {sourceName && sourceName !== draft?.entry && (
              <button
                type="button"
                className="icon-button"
                aria-label="Remove source file"
                onClick={() => {
                  editor.removeFile(sourceName);
                  setSelected(preferred);
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          <SourceCode
            name={name}
            source={source}
            editable={editable}
            pending={pending}
            maxLength={metadata ? 1000000 : 250000}
            change={(text) => {
              if (metadata) editor.changeMetadata(text);
              else if (sourceName) editor.changeFile(sourceName, text);
            }}
          />
        </section>
      </div>
      <SceneJobFeedback job={editor.job} error={editor.error} conflict={editor.conflict} />
      <p className="source-hint">
        Drafts save with the project. Apply checks the code before replacing the working scene.
        Built-in references are read-only.
      </p>
    </main>
  );
}

export function CodeView({
  catalogId,
  project,
  slide,
  pending,
  edit,
  flush,
  resource,
  selectResource,
}: CodeViewProps & {
  catalogId: string;
  resource: CodeResource;
  selectResource: (resource: CodeResource) => void;
}): React.JSX.Element {
  const catalog = useReferenceSources(catalogId);
  const tabs = <CodeResourceTabs resource={resource} select={selectResource} />;
  if (resource === 'transition')
    return (
      <TransitionCodeView
        project={project}
        pending={pending}
        edit={edit}
        flush={flush}
        tabs={tabs}
      />
    );
  if (!catalog.files)
    return (
      <main className="workspace" role={catalog.error ? 'alert' : 'status'}>
        {catalog.error ?? 'Opening scene source…'}
      </main>
    );
  return (
    <SceneCodeView
      referenceSources={catalog.files}
      key={`${slide.id}:${slide.scene?.definitionId ?? 'built-in'}`}
      project={project}
      slide={slide}
      pending={pending}
      edit={edit}
      flush={flush}
      tabs={tabs}
    />
  );
}
