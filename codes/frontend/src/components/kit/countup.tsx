// A number that counts up when it first comes into view, then glides from its old value to a new one when the value changes
// (switching egg boiled → fried rolls 155 → 196). requestAnimationFrame, ~700 ms, ease-out cubic; tabular digits keep the width
// steady so nothing beside it moves. Reduced motion shows the final number at once.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { reducedMotion } from '@/lib/utils';

const DURATION_MS = 700;

type Props = { value: number; digits?: number | undefined; className?: string | undefined };

export function CountUp({ value, digits = 0, className }: Readonly<Props>) {
  const { num } = useI18n();
  const node = useRef<HTMLSpanElement>(null);
  const shownRef = useRef<number | null>(null);
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const factor = 10 ** digits;
  useEffect(() => {
    const element = node.current;
    if (!element || reducedMotion() || !('IntersectionObserver' in window)) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    let settle = 0;
    const tween = (from: number) => {
      // animation frames pause in a background tab: a timer makes sure the real number always lands
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        cancelAnimationFrame(frame);
        shownRef.current = value;
        setShown(value);
      }, DURATION_MS + 120);
      const start = performance.now();
      const step = (time: number) => {
        const progress = Math.min(1, (time - start) / DURATION_MS);
        const next = from + (value - from) * (1 - (1 - progress) ** 3);
        shownRef.current = next;
        setShown(Math.round(next * factor) / factor);
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    // seen before: glide from where it is now
    if (shownRef.current !== null) {
      tween(shownRef.current);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(settle);
      };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      tween(0);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [value, factor]);
  return (
    <span ref={node} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {num(digits > 0 ? Number(shown.toFixed(digits)) : shown)}
    </span>
  );
}
