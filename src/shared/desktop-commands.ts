import { z } from 'zod';

export const desktopCommandSchema = z.enum([
  'newProject',
  'open',
  'save',
  'saveAs',
  'importMedia',
  'close',
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'selectAll',
  'canvas',
  'code',
  'present',
  'appearance',
  'connection',
]);
export type DesktopCommand = z.infer<typeof desktopCommandSchema>;
export const nativeEditSchema = z.enum(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']);
export type NativeEditCommand = z.infer<typeof nativeEditSchema>;
export function desktopShortcut(
  input: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): DesktopCommand | null {
  const key = input.key.toLowerCase();
  if (input.altKey) return null;
  if (!input.ctrlKey && !input.metaKey) return key === 'f5' ? 'present' : null;
  if (key === 's') return input.shiftKey ? 'saveAs' : 'save';
  if (key === 'z') return input.shiftKey ? 'redo' : 'undo';
  if (input.shiftKey) return null;
  const commands: Record<string, DesktopCommand> = {
    n: 'newProject',
    o: 'open',
    i: 'importMedia',
    w: 'close',
    '1': 'canvas',
    '2': 'code',
    ',': 'appearance',
  };
  return commands[key] ?? null;
}
