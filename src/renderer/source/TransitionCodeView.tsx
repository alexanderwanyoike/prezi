import { useState } from 'react';
import type { ReactNode } from 'react';
import { FileCode2, Plus, Trash2 } from 'lucide-react';
import type { EditOperation, Project } from '../../shared/project';
import { scenePathSchema } from '../../shared/custom-scene';
import { builtInSceneSources } from '../../shared/scene-sources';
import { presentationTheme } from '../../shared/presentation-theme';
import { CustomSceneInspector } from '../CustomSceneInspector';
import { NumberField } from '../NumberField';
import { SourceCode } from './SourceCode';
import { SceneJobFeedback } from './SceneJobFeedback';
import { useTransitionDraft } from './useTransitionDraft';
import { readTransitionMetadata } from './transition-draft';

export function TransitionCodeView({
  project,
  pending,
  edit,
  flush,
  tabs,
}: {
  project: Project;
  pending: boolean;
  edit: (operations: EditOperation[], label: string) => void;
  flush: () => Promise<void>;
  tabs: ReactNode;
}): React.JSX.Element {
  const editor = useTransitionDraft(project, pending, edit, flush);
  const { draft } = editor;
  const working = project.transition;
  const files = draft?.files ??
    working?.source.files ?? {
      'TransitionLayer.tsx': builtInSceneSources['renderer/presentation/TransitionLayer.tsx'] ?? '',
    };
  const entry = draft?.entry ?? working?.source.entry ?? 'TransitionLayer.tsx';
  const [selected, setSelected] = useState(`source/${entry}`);
  const isMetadata = selected === 'definition.json' && Boolean(draft ?? working);
  const sourceName = selected.startsWith('source/') ? selected.slice(7) : entry;
  let name = files[sourceName] !== undefined ? sourceName : entry;
  if (isMetadata) name = 'definition.json';
  const metadataText =
    draft?.metadata ??
    JSON.stringify(
      {
        name: working?.name ?? 'Default crossfade',
        fields: working?.fields ?? {},
        properties: working?.properties ?? {},
      },
      null,
      2,
    );
  const metadata = readTransitionMetadata(metadataText);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  return (
    <main
      className="workspace transition-source-workspace"
      id="code-resource-panel"
      role="tabpanel"
      aria-labelledby="code-transition-tab"
    >
      <div className="canvas-heading">
        {tabs}
        <div className="source-commands">
          {!draft && (
            <button
              type="button"
              onClick={() => {
                const next = editor.create();
                setSelected(`source/${next.entry}`);
              }}
            >
              {working ? 'Edit transition code' : 'Create transition code'}
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
                Apply transition code
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
                  setSelected(`source/${working?.source.entry ?? 'TransitionLayer.tsx'}`);
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
      <div className="transition-layout">
        <div className="transition-editor">
          <div className="source-browser">
            <nav className="source-files" aria-label="Transition source files">
              {(draft ?? working) && (
                <button
                  type="button"
                  aria-pressed={isMetadata}
                  onClick={() => {
                    setSelected('definition.json');
                  }}
                >
                  definition.json
                </button>
              )}
              {Object.keys(files).map((path) => (
                <button
                  type="button"
                  key={path}
                  aria-pressed={!isMetadata && name === path}
                  onClick={() => {
                    setSelected(`source/${path}`);
                  }}
                >
                  <FileCode2 size={15} />
                  <span>{path}</span>
                </button>
              ))}
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
              {adding && draft && (
                <form
                  className="source-new-file"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const parsed = scenePathSchema.safeParse(newName);
                    if (
                      !parsed.success ||
                      files[newName] !== undefined ||
                      Object.keys(files).length >= 32
                    ) {
                      setFileError(
                        'Choose a new local .ts, .tsx or .json path; at most 32 files are supported.',
                      );
                      return;
                    }
                    editor.changeFile(
                      parsed.data,
                      parsed.data.endsWith('.json') ? '{}\n' : 'export {};\n',
                    );
                    setSelected(`source/${parsed.data}`);
                    setNewName('');
                    setAdding(false);
                    setFileError(null);
                  }}
                >
                  <label htmlFor="new-transition-file">Filename</label>
                  <input
                    id="new-transition-file"
                    value={newName}
                    onChange={(event) => {
                      setNewName(event.target.value);
                    }}
                  />
                  <button type="submit">Add file</button>
                </form>
              )}
            </nav>
            <section className="source-document" aria-label="Transition source document">
              <div className="source-file-heading">
                <span>{name}</span>
                <span>{draft ? 'EDITABLE' : 'READ ONLY'}</span>
                {draft && !isMetadata && name !== entry && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove source file"
                    onClick={() => {
                      editor.removeFile(name);
                      setSelected(`source/${entry}`);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <SourceCode
                name={name}
                source={name === 'definition.json' ? metadataText : (files[name] ?? '')}
                editable={!!draft}
                pending={pending}
                maxLength={isMetadata ? 1000000 : 250000}
                change={(text) => {
                  if (isMetadata) editor.changeMetadata(text);
                  else editor.changeFile(name, text);
                }}
              />
            </section>
          </div>
          <SceneJobFeedback
            resource="transition"
            job={editor.job}
            error={editor.error ?? fileError ?? (!metadata.ok ? metadata.error.message : null)}
            conflict={editor.conflict}
          />
        </div>
        <aside className="inspector transition-inspector" aria-label="Transition properties">
          <div className="panel-heading">
            <span>Transition properties</span>
          </div>
          <div className="inspector-body">
            <NumberField
              label="Transition duration (ms)"
              value={presentationTheme(project.theme).transitionMs}
              min={250}
              max={400}
              change={(next) => {
                edit(
                  [{ type: 'setTheme', patch: { transitionMs: next } }],
                  'Change transition duration',
                );
              }}
            />
            {metadata.ok && (draft ?? working) && (
              <CustomSceneInspector
                heading="TRANSITION"
                definition={metadata.value}
                properties={metadata.value.properties}
                update={editor.changeProperty}
              />
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
