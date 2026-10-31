import type { DesktopCommand } from '../../shared/desktop-commands';

export type MenuName = 'File' | 'Edit' | 'View';
export interface ApplicationMenuItem {
  command: DesktopCommand;
  label: string;
  shortcut?: string;
}
export const menuNames: MenuName[] = ['File', 'Edit', 'View'];
export const menuItems: Record<MenuName, (ApplicationMenuItem | null)[]> = {
  File: [
    { command: 'newProject', label: 'New presentation', shortcut: 'N' },
    { command: 'open', label: 'Open…', shortcut: 'O' },
    null,
    { command: 'save', label: 'Save', shortcut: 'S' },
    { command: 'saveAs', label: 'Save as…', shortcut: 'Shift+S' },
    null,
    { command: 'importMedia', label: 'Import media…', shortcut: 'I' },
    null,
    { command: 'close', label: 'Close window', shortcut: 'W' },
  ],
  Edit: [
    { command: 'undo', label: 'Undo', shortcut: 'Z' },
    { command: 'redo', label: 'Redo', shortcut: 'Shift+Z' },
    null,
    { command: 'cut', label: 'Cut', shortcut: 'X' },
    { command: 'copy', label: 'Copy', shortcut: 'C' },
    { command: 'paste', label: 'Paste', shortcut: 'V' },
    { command: 'selectAll', label: 'Select all', shortcut: 'A' },
  ],
  View: [
    { command: 'canvas', label: 'Canvas', shortcut: '1' },
    { command: 'code', label: 'Code', shortcut: '2' },
    null,
    { command: 'present', label: 'Present', shortcut: 'F5' },
    { command: 'appearance', label: 'Appearance…', shortcut: ',' },
    { command: 'connection', label: 'Agent connection…' },
  ],
};
