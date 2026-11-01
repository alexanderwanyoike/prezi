import { useEffect } from 'react';
import { desktopShortcut } from '../shared/desktop-commands';
import type { DesktopCommand } from '../shared/desktop-commands';

export type DesktopActions = Record<DesktopCommand, () => void>;
export function useDesktopCommands(actions: DesktopActions): void {
  useEffect(() => {
    const unsubscribe = window.prezi.subscribeCommand((command) => {
      actions[command]();
    });
    function keydown(event: KeyboardEvent): void {
      const command = desktopShortcut(event);
      const typing =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(event.target.tagName));
      if (!command || ((command === 'undo' || command === 'redo') && typing)) return;
      event.preventDefault();
      if (!event.repeat) actions[command]();
    }
    window.addEventListener('keydown', keydown);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', keydown);
    };
  }, [actions]);
}
