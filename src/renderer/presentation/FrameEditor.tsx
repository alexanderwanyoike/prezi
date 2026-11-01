import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, PointerEvent } from 'react';
import { Move, ArrowDownRight } from 'lucide-react';

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type FramePatch = { [Key in keyof Frame]?: number | undefined };
export interface FrameEditing {
  selected: boolean;
  pending: boolean;
  select: () => void;
  update: (patch: FramePatch) => void;
}
export type FrameLimits = Partial<Record<keyof Frame, { min?: number; max?: number }>>;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
export function FrameEditor({
  frame,
  children,
  style,
  editing,
  label,
  limits = {},
  layerId,
}: {
  frame: Frame;
  children?: ReactNode;
  style?: CSSProperties | undefined;
  editing?: FrameEditing | undefined;
  label: string;
  limits?: FrameLimits;
  layerId?: string;
}): React.JSX.Element {
  const [draft, setDraft] = useState<Frame | null>(null);
  const gesture = useRef<{
    frame: Frame;
    x: number;
    y: number;
    scale: number;
    resize: boolean;
    signature: string;
  } | null>(null);
  const signature = JSON.stringify(frame);
  const pending = editing?.pending ?? false;
  useEffect(() => {
    gesture.current = null;
    setDraft(null);
  }, [signature, pending]);
  function begin(event: PointerEvent<HTMLElement>, resize: boolean): void {
    if (!editing || pending || event.button !== 0) return;
    const canvas = event.currentTarget.closest('.composition-transform');
    const scale = (canvas?.getBoundingClientRect().width ?? 0) / 1920;
    if (scale <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    editing.select();
    gesture.current = { frame, x: event.clientX, y: event.clientY, scale, resize, signature };
    setDraft(frame);
  }
  function move(event: PointerEvent<HTMLDivElement>): void {
    const start = gesture.current;
    if (!start || pending || signature !== start.signature) return;
    const dx = Math.round((event.clientX - start.x) / start.scale);
    const dy = Math.round((event.clientY - start.y) / start.scale);
    const bound = (key: keyof Frame, value: number, min: number, max: number): number =>
      clamp(value, Math.max(min, limits[key]?.min ?? min), Math.min(max, limits[key]?.max ?? max));
    const next = start.resize
      ? {
          ...start.frame,
          width: bound('width', start.frame.width + dx, 64, 1920 - start.frame.x),
          height: bound('height', start.frame.height + dy, 64, 1080 - start.frame.y),
        }
      : {
          ...start.frame,
          x: bound('x', start.frame.x + dx, 0, 1920 - start.frame.width),
          y: bound('y', start.frame.y + dy, 0, 1080 - start.frame.height),
        };
    setDraft(next);
  }
  function cancel(): void {
    gesture.current = null;
    setDraft(null);
  }
  function finish(): void {
    const start = gesture.current;
    if (!start || !draft || pending || signature !== start.signature) {
      cancel();
      return;
    }
    const patch: Partial<Frame> = {};
    (Object.keys(draft) as (keyof Frame)[]).forEach((key) => {
      if (draft[key] !== start.frame[key]) patch[key] = draft[key];
    });
    cancel();
    if (Object.keys(patch).length) editing?.update(patch);
  }
  const shown = draft ?? frame;
  return (
    <div
      data-layer={layerId}
      data-frame={label}
      data-selected={editing?.selected ?? false}
      style={{
        ...style,
        position: 'absolute',
        left: shown.x,
        top: shown.y,
        width: shown.width,
        height: shown.height,
      }}
      onPointerDownCapture={() => editing?.select()}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && gesture.current) {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
      }}
    >
      {children}
      {editing?.selected && (
        <>
          <button
            className="frame-handle frame-move"
            type="button"
            aria-label={`Move ${label}`}
            disabled={pending}
            onPointerDown={(event) => begin(event, false)}
          >
            <Move />
          </button>
          <button
            className="frame-handle frame-resize"
            type="button"
            aria-label={`Resize ${label}`}
            disabled={pending}
            onPointerDown={(event) => begin(event, true)}
          >
            <ArrowDownRight />
          </button>
        </>
      )}
    </div>
  );
}
