// Class names. Shell Console runs them through tailwind-merge so a caller's utility beats a component's default; that library is
// ~10 KB gzip, which the first bundle cannot afford (≤ 90 KB). Pathya's `cn` is clsx alone, and kit components are written so a
// caller's classes never fight their defaults (a variant or a prop changes a look; an intentional override uses Tailwind's `!`).
// `merge` is the tailwind-merge version for lazy code that really needs it.
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Whether the reader asked for less motion (read when it is needed, so a change is honoured). */
export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A tone for an inline style: `style={tone('#16a34a')}` sets --tone for the tile / dot / tone-soft utilities. */
export const tone = (color: string): React.CSSProperties => ({ '--tone': color }) as React.CSSProperties;
