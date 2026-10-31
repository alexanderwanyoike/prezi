import { useRef } from 'react';
import { Code2, PanelsTopLeft } from 'lucide-react';

export function WorkspaceTabs({
  code,
  select,
}: {
  code: boolean;
  select: (code: boolean) => void;
}): React.JSX.Element {
  const canvasTab = useRef<HTMLButtonElement>(null);
  const codeTab = useRef<HTMLButtonElement>(null);
  function keydown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'ArrowRight' || event.key === 'End';
    select(next);
    if (next) codeTab.current?.focus();
    else canvasTab.current?.focus();
  }
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Workspace view">
      <button
        type="button"
        ref={canvasTab}
        role="tab"
        id="canvas-tab"
        aria-controls="workspace-panel"
        aria-selected={!code}
        tabIndex={code ? -1 : 0}
        onKeyDown={keydown}
        onClick={() => {
          select(false);
        }}
      >
        <PanelsTopLeft size={14} />
        Canvas
      </button>
      <button
        type="button"
        ref={codeTab}
        role="tab"
        id="code-tab"
        aria-controls="workspace-panel"
        aria-selected={code}
        tabIndex={code ? 0 : -1}
        onKeyDown={keydown}
        onClick={() => {
          select(true);
        }}
      >
        <Code2 size={14} />
        Code
      </button>
    </div>
  );
}
