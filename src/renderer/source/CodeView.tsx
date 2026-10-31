import { useState } from 'react';
import { Braces, FileCode2 } from 'lucide-react';
import type { Project, Slide } from '../../shared/project';
import { projectSources } from '../../shared/project-sources';
import { SourceCode } from './SourceCode';

export function CodeView({
  project,
  slide,
}: {
  project: Project;
  slide: Slide;
}): React.JSX.Element {
  const sources = projectSources(project);
  const paths = Object.keys(sources).sort();
  const [selected, setSelected] = useState<string | null>(() => {
    const definition = project.scenes?.[slide.scene?.definitionId ?? ''];
    return definition
      ? `scenes/${definition.id}/source/${definition.source.entry}`
      : 'renderer/presentation/SlideScene.tsx';
  });
  let name = 'slide-properties.json';
  let source = JSON.stringify(slide, null, 2);
  if (selected !== null) {
    name = sources[selected] !== undefined ? selected : (paths[0] ?? 'scene.tsx');
    source = sources[name] ?? 'No source is stored in this project.';
  }
  return (
    <main className="workspace source-workspace">
      <div className="canvas-heading">
        <span>SCENE SOURCE</span>
        <span>READ ONLY</span>
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
          <span className="eyebrow">REMOTION / SCENES</span>
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
            <span>{source.split('\n').length} lines</span>
          </div>
          <SourceCode name={name} source={source} />
        </section>
      </div>
      <p className="source-hint">
        Scene code defines the composition. Slide properties hold this instance’s values.
      </p>
    </main>
  );
}
