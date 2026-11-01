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
  setConnectionOpen: (value: boolean) => void;
  setUpdatesOpen: (value: boolean) => void;
  setThemeOpen: (value: boolean) => void;
}
export function useApplicationActions({
  project,
  selectedId,
  setPresenting,
  setCodeVisible,
  setAppearanceOpen,
  setConnectionOpen,
  setUpdatesOpen,
  setThemeOpen,
}: Props): { actions: DesktopActions; error: string | null } {
  const { snapshot, newProject, open, save, importMedia, undo, redo } = project;
  const [desktopError, setDesktopError] = useState<string | null>(null);
  function handleDesktop(result: Promise<Result<boolean>>): void {
    void result.then((response) => {
      setDesktopError(response.ok ? null : response.error.message);
    });
  }
  function editor(code?: boolean): void {
    setConnectionOpen(false);
    setUpdatesOpen(false);
    setThemeOpen(false);
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
    importFont: () => {
      editor();
      setThemeOpen(true);
      project.importFont();
    },
    importMedia: () => {
      editor();
      const id =
        snapshot?.project.slides.find((item) => item.id === selectedId)?.id ??
        snapshot?.project.slides[0]?.id;
      if (id) importMedia(id);
    },
    close: () => {
      void project.flush().then(() => {
        handleDesktop(window.prezi.close());
      });
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
    updates: () => {
      editor();
      setAppearanceOpen(false);
      setUpdatesOpen(true);
    },
    connection: () => {
      editor();
      setAppearanceOpen(false);
      setConnectionOpen(true);
    },
    present: () => {
      setConnectionOpen(false);
      setUpdatesOpen(false);
      setAppearanceOpen(false);
      setPresenting(true);
    },
    presentationTheme: () => {
      editor();
      setAppearanceOpen(false);
      setThemeOpen(true);
    },
    appearance: () => {
      editor();
      setAppearanceOpen(true);
    },
  };
  useDesktopCommands(actions);
  return { actions, error: desktopError };
}
