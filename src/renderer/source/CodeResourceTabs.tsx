export type CodeResource = 'scene' | 'transition';
export function CodeResourceTabs({
  resource,
  select,
}: {
  resource: CodeResource;
  select: (resource: CodeResource) => void;
}): React.JSX.Element {
  return (
    <div
      className="code-resource-tabs"
      role="tablist"
      tabIndex={-1}
      aria-label="Code resource"
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'scene' : 'transition';
        select(next);
        event.currentTarget.querySelector<HTMLButtonElement>(`[data-resource="${next}"]`)?.focus();
      }}
    >
      {(['scene', 'transition'] as const).map((item) => (
        <button
          key={item}
          data-resource={item}
          id={`code-${item}-tab`}
          type="button"
          role="tab"
          aria-label={`${item === 'scene' ? 'Scene' : 'Transition'} code`}
          aria-controls="code-resource-panel"
          aria-selected={item === resource}
          tabIndex={item === resource ? 0 : -1}
          onClick={() => {
            select(item);
          }}
        >
          {item === 'scene' ? 'Scene' : 'Transition'}
        </button>
      ))}
    </div>
  );
}
