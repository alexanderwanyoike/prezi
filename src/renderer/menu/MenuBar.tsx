import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { desktopShortcut } from '../../shared/desktop-commands';
import type { DesktopCommand } from '../../shared/desktop-commands';
import type { DesktopActions } from '../useDesktopCommands';
import { menuItems, menuNames } from './menu-items';
import type { MenuName } from './menu-items';

interface Props {
  actions: DesktopActions;
  code: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}
export function MenuBar({
  actions,
  code,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState<MenuName | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const previousRange = useRef<Range | null>(null);
  function rememberFocus(): void {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selection = window.getSelection();
    previousRange.current =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  }
  function show(name: MenuName): void {
    if (open === null) rememberFocus();
    setOpen(name);
  }
  useLayoutEffect(() => {
    if (open)
      root.current
        ?.querySelector<HTMLButtonElement>('[role="menu"] button:not(:disabled)')
        ?.focus();
  }, [open]);
  useEffect(() => {
    function outside(event: PointerEvent): void {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
    }
    function keydown(event: KeyboardEvent): void {
      const name = menuNames.find((item) => item[0]?.toLowerCase() === event.key.toLowerCase());
      if (event.altKey && !event.ctrlKey && !event.metaKey && name) {
        event.preventDefault();
        rememberFocus();
        setOpen(name);
      } else if (desktopShortcut(event)) setOpen(null);
    }
    const unsubscribe = window.prezi.subscribeCommand(() => {
      setOpen(null);
    });
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', keydown);
    return () => {
      unsubscribe();
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', keydown);
    };
  }, []);
  function execute(command: DesktopCommand): void {
    setOpen(null);
    if (['cut', 'copy', 'paste', 'selectAll', 'save', 'saveAs'].includes(command)) {
      previousFocus.current?.focus();
      const range = previousRange.current;
      if (
        range?.commonAncestorContainer.isConnected &&
        previousFocus.current?.contains(range.commonAncestorContainer)
      ) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } else if (
      (command === 'undo' || command === 'redo') &&
      document.activeElement instanceof HTMLElement
    )
      document.activeElement.blur();
    actions[command]();
  }
  function disabled(command: DesktopCommand): boolean {
    if (command === 'undo') return !canUndo;
    if (command === 'redo') return !canRedo;
    const target = previousFocus.current;
    const input =
      target instanceof HTMLInputElement &&
      !target.readOnly &&
      !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file'].includes(target.type);
    const editable =
      input ||
      (target instanceof HTMLTextAreaElement && !target.readOnly) ||
      target?.isContentEditable;
    if (command === 'cut' || command === 'paste') return !editable;
    if (command === 'selectAll') return !editable && !target?.closest('.source-code');
    return false;
  }
  function moveInMenu(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Tab') {
      root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
      setOpen(null);
      return;
    }
    if (open && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const index = menuNames.indexOf(open);
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      setOpen(menuNames[(index + direction + menuNames.length) % menuNames.length] ?? null);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      root.current?.querySelector<HTMLButtonElement>(`[data-menu-name="${open}"]`)?.focus();
      setOpen(null);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    ];
    if (!buttons.length) return;
    const index = buttons.findIndex((button) => button === document.activeElement);
    let next = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    buttons[(next + buttons.length) % buttons.length]?.focus();
  }
  return (
    <div ref={root} className="application-menubar" role="menubar" aria-label="Application menu">
      {menuNames.map((name, index) => (
        <div className="application-menu-group" key={name}>
          <button
            type="button"
            role="menuitem"
            data-menu-name={name}
            aria-haspopup="menu"
            aria-expanded={open === name}
            tabIndex={index === 0 ? 0 : -1}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            onPointerEnter={() => {
              if (open) setOpen(name);
            }}
            onClick={() => {
              if (open === name) setOpen(null);
              else show(name);
            }}
            onKeyDown={(event) => {
              if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
                event.preventDefault();
                show(name);
              }
              if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                const next =
                  menuNames[(index + (event.key === 'ArrowLeft' ? 2 : 1)) % menuNames.length];
                if (next) {
                  root.current
                    ?.querySelector<HTMLButtonElement>(`[data-menu-name="${next}"]`)
                    ?.focus();
                  if (open) show(next);
                }
              }
            }}
          >
            {name}
          </button>
          {open === name && (
            <div
              className="application-menu-popup"
              role="menu"
              tabIndex={-1}
              aria-label={name}
              onKeyDown={moveInMenu}
            >
              {menuItems[name].map((item, itemIndex) => {
                if (!item)
                  return (
                    <div
                      role="separator"
                      className="application-menu-separator"
                      key={`separator-${itemIndex.toString()}`}
                    />
                  );
                let { label } = item;
                if (item.command === 'undo' && undoLabel) label = `Undo: ${undoLabel}`;
                if (item.command === 'redo' && redoLabel) label = `Redo: ${redoLabel}`;
                let checked: boolean | undefined;
                if (item.command === 'canvas') checked = !code;
                if (item.command === 'code') checked = code;
                let shortcut = item.shortcut ?? '';
                if (shortcut && shortcut !== 'F5')
                  shortcut = `${window.prezi.platform === 'darwin' ? '⌘' : 'Ctrl+'}${shortcut}`;
                return (
                  <button
                    type="button"
                    role={checked === undefined ? 'menuitem' : 'menuitemradio'}
                    tabIndex={-1}
                    aria-checked={checked}
                    aria-label={label}
                    disabled={disabled(item.command)}
                    key={item.command}
                    onPointerDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => {
                      execute(item.command);
                    }}
                  >
                    <span className="menu-check">{checked && <Check size={13} />}</span>
                    <span>{label}</span>
                    <kbd>{shortcut}</kbd>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
