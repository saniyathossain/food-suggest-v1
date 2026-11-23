// A time series as a smooth area: a soft gradient under a monotone curve, three quiet gridlines, the first, middle and last label,
// and on hover (or touch) a crosshair with the day's value in a small floating card. Plain SVG; the curve is drawn once and the
// pointer only moves two elements, so it costs nothing. Respects reduced motion (the draw-in is CSS and switches off).
import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type SeriesPoint = { key: string; value: number };

type Props = Readonly<{
  points: SeriesPoint[];
  color?: string | undefined;
  height?: number | undefined;
  format?: ((value: number) => string) | undefined;
  /** the sentence a screen reader gets in place of the picture */
  ariaLabel: string;
  className?: string | undefined;
}>;

const W = 600;
const PAD = { left: 6, right: 6, top: 10, bottom: 4 };

/** A curve through the points that never overshoots them (monotone cubic), so a quiet day never dips below zero. */
function curve(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return '';
  if (n === 1) return `M${xs[0]},${ys[0]}`;
  const slope = xs.slice(1).map((x, i) => ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / (x - (xs[i] ?? 0) || 1));
  const tangent = ys.map((_, i) => {
    if (i === 0) return slope[0] ?? 0;
    if (i === n - 1) return slope[n - 2] ?? 0;
    const before = slope[i - 1] ?? 0;
    const after = slope[i] ?? 0;
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  let path = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const third = (x1 - x0) / 3;
    path += ` C${x0 + third},${(ys[i] ?? 0) + (tangent[i] ?? 0) * third} ${x1 - third},${(ys[i + 1] ?? 0) - (tangent[i + 1] ?? 0) * third} ${x1},${ys[i + 1]}`;
  }
  return path;
}

export function AreaChart({ points, color = 'var(--leaf)', height = 168, format = String, ariaLabel, className }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<number | null>(null);
  const peak = Math.max(1, ...points.map((point) => point.value));
  // a round ceiling so the gridlines read as whole numbers
  const ceiling = peak <= 4 ? 4 : Math.ceil(peak / 4) * 4;
  const inner = { w: W - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom };
  const xs = points.map((_, i) => PAD.left + (points.length === 1 ? inner.w / 2 : (i / (points.length - 1)) * inner.w));
  const ys = points.map((point) => PAD.top + inner.h - (point.value / ceiling) * inner.h);
  const line = curve(xs, ys);
  const floor = PAD.top + inner.h;
  const area = points.length > 1 ? `${line} L${xs[xs.length - 1]},${floor} L${xs[0]},${floor} Z` : '';
  const move = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setAt(Math.round(ratio * (points.length - 1)));
  };
  const hot = at === null ? null : points[at];
  const hotX = at === null ? 0 : ((xs[at] ?? 0) / W) * 100;
  return (
    <figure className={cn('grid gap-1.5', className)}>
      <div
        ref={box}
        role="img"
        aria-label={ariaLabel}
        className="relative touch-pan-y select-none"
        style={{ height }}
        onPointerMove={(event) => move(event.clientX)}
        onPointerDown={(event) => move(event.clientX)}
        onPointerLeave={() => setAt(null)}
      >
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((step) => {
            const y = PAD.top + (inner.h / 3) * step;
            return <line key={step} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--foreground)" strokeOpacity={step === 3 ? 0.14 : 0.07} strokeDasharray={step === 3 ? undefined : '3 5'} vectorEffect="non-scaling-stroke" />;
          })}
          {area && <path d={area} fill={`url(#${id}-fill)`} />}
          <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="area-draw" pathLength={1} />
        </svg>
        {/* y labels sit on the gridlines, in HTML so they keep their shape when the svg stretches */}
        {[0, 1, 2, 3].map((step) => (
          <span key={step} aria-hidden className="pointer-events-none absolute left-0.5 -translate-y-full text-caption tabular-nums text-faint-foreground" style={{ top: PAD.top + (inner.h / 3) * step }}>
            {step === 3 ? '' : format(Math.round(ceiling - (ceiling / 3) * step))}
          </span>
        ))}
        {hot && at !== null && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-2 w-px bg-foreground/25" style={{ left: `${hotX}%` }} />
            <span aria-hidden className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-card" style={{ left: `${hotX}%`, top: ys[at], borderColor: color }} />
            <span className="glass pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-footnote shadow-md" style={{ left: `clamp(48px, ${hotX}%, calc(100% - 48px))`, top: Math.max(0, (ys[at] ?? 0) - 52) }}>
              <strong className="block text-callout tabular-nums">{format(hot.value)}</strong>
              <span className="text-caption text-muted-foreground">{hot.key}</span>
            </span>
          </>
        )}
      </div>
      <figcaption className="flex justify-between text-caption text-muted-foreground">
        <span>{points[0]?.key ?? ''}</span>
        <span className="hidden sm:inline">{points[Math.floor(points.length / 2)]?.key ?? ''}</span>
        <span>{points[points.length - 1]?.key ?? ''}</span>
      </figcaption>
    </figure>
  );
}
