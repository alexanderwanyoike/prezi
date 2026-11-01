import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { TransitionDefinition } from '../../shared/transition';
import type { TransitionStyle } from '../../shared/transition-style';

export interface SlideMotion {
  definition: TransitionDefinition | undefined;
  durationMs: number;
  navigation: 'advance' | 'back';
}
function keyframe(style: TransitionStyle): Keyframe {
  return {
    opacity: style.opacity,
    transform: `translate(${style.x.toString()}%, ${style.y.toString()}%) scale(${style.scale.toString()}) rotate(${style.rotate.toString()}deg)`,
    filter: `blur(${style.blur.toString()}px)`,
    clipPath: `inset(${style.clipTop.toString()}% ${style.clipRight.toString()}% ${style.clipBottom.toString()}% ${style.clipLeft.toString()}%)`,
  };
}
export function TransitionLayer({
  motion,
  playing,
  generation,
  leaving,
  children,
}: {
  motion: SlideMotion | null;
  playing: boolean;
  generation: number;
  leaving: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!element.current || !motion || !playing) return undefined;
    const role = leaving ? 'exiting' : 'entering';
    const frames =
      motion.definition?.samples[motion.navigation][role].map(keyframe) ??
      (leaving ? [{ opacity: 1 }, { opacity: 1 }] : [{ opacity: 0 }, { opacity: 1 }]);
    const animation = element.current.animate(frames, {
      duration: motion.durationMs,
      easing: 'linear',
      fill: 'both',
    });
    return () => {
      animation.cancel();
    };
  }, [motion, playing, generation, leaving]);
  const preparing = !!motion && !playing && !leaving;
  let className = '';
  if (leaving) className = 'presentation-outgoing';
  else if (motion) className = 'presentation-incoming';
  return (
    <div
      ref={element}
      className={className}
      style={{ opacity: preparing ? 0 : undefined, pointerEvents: preparing ? 'none' : undefined }}
      aria-hidden={leaving ? true : undefined}
    >
      {children}
    </div>
  );
}
