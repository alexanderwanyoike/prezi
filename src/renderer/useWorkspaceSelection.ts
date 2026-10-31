import { useEffect, useState, useRef } from 'react';
import { slideElementIds } from '../shared/slide-elements';
import type { ProjectSnapshot } from '../shared/project';

export function useWorkspaceSelection(
  snapshot: ProjectSnapshot | null,
  selectedId: string | null,
  field: string | null,
  selectSlide: (id: string) => void,
  selectField: (field: string | null) => void,
): string | null {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () =>
      window.prezi.subscribeSelection((selection) => {
        selectSlide(selection.slideId);
        const id = selection.elementId?.split(':')[1];
        if (
          id &&
          latest.current?.project.slides.find((slide) => slide.id === selection.slideId)?.scene
        )
          selectField(`layer/${id}`);
        else if (id === 'heading') selectField('title');
        else if (id === 'body') selectField('body');
        else selectField(null);
      }),
    [selectSlide, selectField],
  );
  const id = selectedId ?? snapshot?.project.slides[0]?.id;
  const exists = snapshot?.project.slides.some((slide) => slide.id === id);
  let element = field;
  if (field?.startsWith('layer/')) element = field.slice(6);
  else if (field === 'title') element = 'heading';
  const elementId = id && element ? `${id}:${element}` : null;
  const valid =
    !elementId || !!(snapshot && id && slideElementIds(snapshot.project, id).includes(elementId));
  useEffect(() => {
    if (!valid) selectField(null);
  }, [valid, selectField]);
  useEffect(() => {
    if (!id || !exists || !valid) return;
    void window.prezi.publishView({ selection: { slideId: id, elementId } }).then((result) => {
      setError(result.ok ? null : result.error.message);
    });
  }, [id, exists, elementId, valid]);
  return error;
}
