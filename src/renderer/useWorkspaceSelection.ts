import { useEffect, useState } from 'react';
import type { ProjectSnapshot } from '../shared/project';
import type { TextField } from '../shared/text-scene';

export function useWorkspaceSelection(
  snapshot: ProjectSnapshot | null,
  selectedId: string | null,
  field: TextField | null,
  selectSlide: (id: string) => void,
  selectField: (field: TextField | null) => void,
): string | null {
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () =>
      window.prezi.subscribeSelection((selection) => {
        selectSlide(selection.slideId);
        const id = selection.elementId?.split(':')[1];
        if (id === 'heading') selectField('title');
        else if (id === 'body') selectField('body');
        else selectField(null);
      }),
    [selectSlide, selectField],
  );
  const id = selectedId ?? snapshot?.project.slides[0]?.id;
  const exists = snapshot?.project.slides.some((slide) => slide.id === id);
  useEffect(() => {
    if (!id || !exists) return;
    const element = field === 'title' ? 'heading' : field;
    void window.prezi
      .publishView({ selection: { slideId: id, elementId: element ? `${id}:${element}` : null } })
      .then((result) => {
        setError(result.ok ? null : result.error.message);
      });
  }, [id, exists, field]);
  return error;
}
