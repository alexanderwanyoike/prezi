import { useState } from 'react';
import type { Result } from '../shared/result';
import type { useProject } from './useProject';
import { selectFocusedSource } from './source/source-selection';
import { useDesktopCommands } from './useDesktopCommands';
import type { DesktopActions } from './useDesktopCommands';

interface Props {
  project: ReturnType<typeof useProject>;
  selectedId: string | null;
  setPresenting: (value: boolean) => void;
  setCodeVisible: (value: boolean) => void;
  setAppearanceOpen: (value: boolean) => void;
}
export function useApplicationActions({
  project,
  selectedId,
  setPresenting,
  setCodeVisible,
  setAppearanceOpen,
}: Props): { actions: DesktopActions; error: string | null } {
  const { snapshot, newProject, open, save, importMedia, undo, redo } = project;
  const [desktopError, setDesktopError] = useState<string | null>(null);
  function handleDesktop(result: Promise<Result<boolean>>): void {
    void result.then((response) => {
      setDesktopError(response.ok ? null : response.error.message);
    });
  }
  function editor(code?: boolean): void {
    setPresenting(false);
    if (code !== undefined) setCodeVisible(code);
    handleDesktop(window.prezi.fullscreen(false));
  }
  const actions: DesktopActions = {
    newProject: () => {
      editor();
      newProject();
    },
    open: () => {
      editor();
      open();
    },
    save: () => {
      save();
    },
    saveAs: () => {
      save(true);
    },
    importMedia: () => {
      editor();
      const id =
        snapshot?.project.slides.find((item) => item.id === selectedId)?.id ??
        snapshot?.project.slides[0]?.id;
      if (id) importMedia(id);
    },
    close: () => {
      handleDesktop(window.prezi.close());
    },
    undo,
    redo,
    cut: () => {
      handleDesktop(window.prezi.nativeEdit('cut'));
    },
    copy: () => {
      handleDesktop(window.prezi.nativeEdit('copy'));
    },
    paste: () => {
      handleDesktop(window.prezi.nativeEdit('paste'));
    },
    selectAll: () => {
      if (!selectFocusedSource()) handleDesktop(window.prezi.nativeEdit('selectAll'));
    },
    canvas: () => {
      editor(false);
    },
    code: () => {
      editor(true);
    },
    present: () => {
      setAppearanceOpen(false);
      setPresenting(true);
    },
    appearance: () => {
      editor();
      setAppearanceOpen(true);
    },
  };
  useDesktopCommands(actions);
  return { actions, error: desktopError };
}
