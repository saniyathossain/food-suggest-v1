// The liquid tab indicator (iOS 26's liquid glass tab bar): one pill behind a row of tabs that, when the chosen tab changes, stretches
// toward the new one like a droplet — reaching across both, squashing a little — then lets go and settles on it with a spring. The
// pill is a glass bead: the brand ink with a top sheen, a lit rim and a soft drop. It moves with transform and size on one element
// (Web Animations, no layout thrash), re-measures on resize without animating, and simply jumps for people who ask for less motion.
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { reducedMotion } from '@/lib/utils';

type Box = { x: number; y: number; w: number; h: number };

const CHOSEN = '[aria-current="page"], [aria-pressed="true"], [aria-selected="true"]';

export function useLiquid<Host extends HTMLElement>(key: unknown, target: string = CHOSEN): { host: RefObject<Host | null>; pill: RefObject<HTMLSpanElement | null> } {
  const host = useRef<Host>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const last = useRef<Box | null>(null);
  useLayoutEffect(() => {
    const track = host.current;
    const bead = pill.current;
    if (!track || !bead) return;
    const measure = (): Box | null => {
      const chosen = track.querySelector<HTMLElement>(target);
      if (!chosen) return null;
      const outer = track.getBoundingClientRect();
      const inner = chosen.getBoundingClientRect();
      return { x: inner.left - outer.left + track.scrollLeft, y: inner.top - outer.top + track.scrollTop, w: inner.width, h: inner.height };
    };
    const place = (box: Box) => {
      bead.style.transform = `translate(${box.x}px, ${box.y}px)`;
      bead.style.width = `${box.w}px`;
      bead.style.height = `${box.h}px`;
      bead.style.opacity = '1';
    };
    const box = measure();
    if (!box) {
      bead.style.opacity = '0';
      last.current = null;
      return;
    }
    const from = last.current;
    place(box);
    last.current = box;
    if (from && (from.x !== box.x || from.y !== box.y) && !reducedMotion()) {
      const left = Math.min(from.x, box.x);
      const reach = Math.max(from.x + from.w, box.x + box.w) - left;
      const squash = 0.82;
      bead.animate(
        [
          { transform: `translate(${from.x}px, ${from.y}px)`, width: `${from.w}px`, height: `${from.h}px` },
          { transform: `translate(${left}px, ${box.y + (box.h * (1 - squash)) / 2}px)`, width: `${reach}px`, height: `${box.h * squash}px`, offset: 0.42 },
          { transform: `translate(${box.x}px, ${box.y}px)`, width: `${box.w}px`, height: `${box.h}px` },
        ],
        { duration: 560, easing: 'cubic-bezier(0.34, 1.32, 0.4, 1)' },
      );
    }
    const observer = new ResizeObserver(() => {
      const next = measure();
      if (next) {
        place(next);
        last.current = next;
      }
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [key, target]);
  return { host, pill };
}

/** The bead itself: put it first inside the (relative) track; the tabs sit above it. */
export function LiquidPill({ pill, className }: { pill: RefObject<HTMLSpanElement | null>; className?: string | undefined }) {
  return <span ref={pill} aria-hidden className={`liquid-pill ${className ?? ''}`} />;
}
