// A ring chart (Shell Console's Donut): the slices share the circle, the middle shows the total, the slice pointed at steps outwards
// and the middle says its share; a click on the legend hides a category and the rest share the circle. Pathya draws it in plain SVG
// with CSS transitions (no recharts, no tween loop), so it costs almost nothing.
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type Slice = { key: string; label: string; value: number; color: string };

type Props = Readonly<{
  data: Slice[];
  /** the big figure in the middle and what it says under it */
  total: string;
  center: string;
  format: (value: number) => string;
  ariaLabel: string;
  className?: string | undefined;
}>;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2.2;

export function Donut({ data, total, center, format, ariaLabel, className }: Props) {
  const [off, setOff] = useState<string[]>([]);
  const [hot, setHot] = useState<string | null>(null);
  const shown = data.map((slice) => (off.includes(slice.key) ? 0 : slice.value));
  const sum = shown.reduce((acc, amount) => acc + amount, 0) || 1;
  let start = 0;
  const arcs = data.map((slice, index) => {
    const share = ((shown[index] ?? 0) / sum) * CIRCUMFERENCE;
    const arc = { slice, length: Math.max(0, share - (share > GAP * 2 ? GAP : 0)), at: start };
    start += share;
    return arc;
  });
  const focus = data.find((slice) => slice.key === hot);
  const toggle = (key: string) => setOff((hidden) => (hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]));
  return (
    <div className={cn('flex flex-col items-center gap-5 sm:flex-row sm:gap-7', className)}>
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 128 128" role="img" aria-label={ariaLabel} className="size-full -rotate-90">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth="14" />
          {arcs.map(({ slice, length, at }) => (
            <circle
              key={slice.key}
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={hot === slice.key ? 18 : 14}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-at}
              opacity={hot && hot !== slice.key ? 0.4 : 1}
              className="transition-[stroke-dasharray,stroke-dashoffset,stroke-width,opacity] duration-500 ease-[var(--ease-out)] motion-reduce:transition-none"
              onPointerEnter={() => setHot(slice.key)}
              onPointerLeave={() => setHot(null)}
            />
          ))}
        </svg>
        {/* the middle: centred both ways inside the ring's hole (about 7 rem wide); a long label (Bangla "কিলোক্যালরি") wraps and stays
            centred instead of running into the ring */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="numeral text-title-2 font-bold leading-none">{focus ? format(focus.value) : total}</span>
          <span className="mt-1.5 max-w-full text-balance break-words text-caption leading-tight text-muted-foreground">{focus ? focus.label : center}</span>
        </div>
      </div>
      <ul className="grid w-full min-w-0 flex-1 gap-1">
        {data.map((slice) => {
          const hidden = off.includes(slice.key);
          return (
            <li key={slice.key}>
              <button
                type="button"
                aria-pressed={!hidden}
                onClick={() => toggle(slice.key)}
                onPointerEnter={() => setHot(slice.key)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(slice.key)}
                onBlur={() => setHot(null)}
                className={cn('flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left text-subhead transition-colors hover:bg-accent', hidden && 'opacity-45')}
              >
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className={cn('min-w-0 flex-1', hidden && 'line-through')}>{slice.label}</span>
                <span className="font-semibold tabular-nums">{format(slice.value)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
