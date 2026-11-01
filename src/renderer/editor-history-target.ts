import type { EditOperation } from '../shared/project';

export function editorHistoryTarget(operations: EditOperation[], label: string): string | null {
  const [operation] = operations;
  if (!operation || operations.length !== 1 || label.startsWith('Move or resize')) return null;
  if (operation.type === 'renameProject') return 'renameProject';
  if (operation.type === 'setSceneDraft' || operation.type === 'setTransitionDraft')
    return operation.draft && label.startsWith('Edit ')
      ? `${operation.type}:${'slideId' in operation ? operation.slideId : ''}:${label}`
      : null;
  if (
    operation.type === 'updateSlide' &&
    !Object.keys(operation.patch).every((key) => ['title', 'body', 'code', 'reveals'].includes(key))
  )
    return null;
  if (
    !['updateSlide', 'updateMedia', 'updateSceneProperties', 'setTheme', 'updateFont'].includes(
      operation.type,
    ) ||
    !('patch' in operation)
  )
    return null;
  if (
    operation.type === 'setTheme' &&
    !Object.values(operation.patch).every(
      (value) =>
        typeof value === 'number' || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)),
    )
  )
    return null;
  if (Object.values(operation.patch).some((value) => typeof value === 'boolean')) return null;
  let target = '';
  if ('slideId' in operation) target = operation.slideId;
  else if ('fontId' in operation) target = operation.fontId;
  const fields = Object.keys(operation.patch).sort().join(',');
  const frame =
    operation.type === 'updateMedia' && operation.patch.frame
      ? Object.keys(operation.patch.frame).sort().join(',')
      : '';
  return `${operation.type}:${target}:${label}:${fields}:${frame}`;
}
