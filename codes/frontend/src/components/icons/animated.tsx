// Icons that move (AnimateIcons, MIT, @animateicons/react: the Hugeicons-style set, each glyph with its own small motion). The still
// glyph draws at once; the moving one is loaded when the browser is idle (its own chunk, it brings its own motion runtime, so it never
// weighs on the first paint) and takes its place. It plays when the control it sits in (a link, a button, a tab, a menu item) is
// pointed at or focused, never on its own, and not at all under reduced motion. Same props as every other icon (components/icons).
// Ported from Shell Console.

import { useEffect, useId, useRef, useState, type ComponentType, type CSSProperties, type RefAttributes } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { AppIcon, IconProps } from '@/components/icons/make';

/** What a moving icon answers through its ref. */
type Handle = { startAnimation: () => void; stopAnimation: () => void };

/** A moving icon as the package ships it. */
export type MovingIcon = ComponentType<{ className?: string; size?: number; style?: CSSProperties } & RefAttributes<Handle>>;

/** The controls whose pointing-at plays the icon inside them. */
const HOST = 'a,button,summary,label,[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="link"]';

const loaded = new Map<string, MovingIcon>();
const loading = new Map<string, Promise<MovingIcon>>();
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whenever the browser has a moment: the next idle callback, else a short wait. */
const whenIdle = (run: () => void) => (window.requestIdleCallback ? window.requestIdleCallback(run) : window.setTimeout(run, 200));

/** The moving icon once it has arrived (each is asked for once, whatever number of places draw it). */
function useMoving(name: string, load: () => Promise<MovingIcon>): MovingIcon | null {
  const [moving, setMoving] = useState<MovingIcon | null>(() => loaded.get(name) ?? null);
  useEffect(() => {
    if (moving || reduced()) return;
    let live = true;
    whenIdle(() => {
      const once =
        loading.get(name) ??
        load().then((icon) => {
          loaded.set(name, icon);
          return icon;
        });
      loading.set(name, once);
      once.then((icon) => live && setMoving(() => icon)).catch(() => undefined);
    });
    return () => {
      live = false;
    };
  }, [moving, name, load]);
  return moving;
}

/** Plays the icon when the control around it is pointed at or focused. */
function usePlayOnHost(id: string, on: boolean) {
  const handle = useRef<Handle>(null);
  useEffect(() => {
    if (!on) return;
    const node = document.querySelector(`[data-anim="${CSS.escape(id)}"]`);
    const host = node?.closest(HOST) ?? node;
    if (!host) return;
    const play = () => handle.current?.startAnimation();
    host.addEventListener('pointerenter', play);
    host.addEventListener('focusin', play);
    return () => {
      host.removeEventListener('pointerenter', play);
      host.removeEventListener('focusin', play);
    };
  }, [id, on]);
  return handle;
}

/** An icon drawn still at once and moving once its motion has arrived. */
export function animated(still: IconSvgElement, name: string, load: () => Promise<MovingIcon>, stroke: number): AppIcon {
  const Glyph = ({ strokeWidth = stroke, size = 24, className, style, ...rest }: IconProps) => {
    const Moving = useMoving(name, load);
    const id = useId();
    const handle = usePlayOnHost(id, Moving !== null);
    if (!Moving) {
      return (
        <HugeiconsIcon
          icon={still}
          size={size}
          strokeWidth={strokeWidth}
          className={className ? `app-icon ${className}` : 'app-icon'}
          {...(style ? { style } : {})}
          {...rest}
        />
      );
    }
    const sized = { '--icon': typeof size === 'number' ? `${size}px` : size, '--icon-stroke': strokeWidth, ...style } as CSSProperties;
    return (
      <Moving
        ref={handle}
        size={24}
        className={className ? `anim-icon ${className}` : 'anim-icon'}
        style={sized}
        {...({ 'data-anim': id, 'aria-hidden': true, ...rest } as Record<string, unknown>)}
      />
    );
  };
  Glyph.displayName = name;
  return Glyph;
}
