// The glow card: a tall frosted-glass capsule with a deep colour glowing inside (Aura-style). A small label at the top, a short
// statement on the left, one big light word on the right, and a thin white chart at the foot with one marked point. The glow is
// layered gradients (no live blur, no filter), so many on a page cost nothing while scrolling. White ink sits on the deep glow in
// both themes (≥ 4.5:1).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Glow = 'green' | 'amber' | 'blue' | 'red' | 'violet';

export function GlowCard({ glow, label, statement, word, chart, className }: { glow: Glow; label: string; statement: string; word: string; chart?: ReactNode; className?: string | undefined }) {
  return (
    <article className={cn('glow-card', className)} data-glow={glow}>
      <p className="relative text-center text-footnote font-medium text-white/80">{label}</p>
      <div className="relative grid grid-cols-[minmax(0,1.1fr)_auto] items-center gap-4">
        <p className="text-callout leading-snug text-white">{statement}</p>
        <p className="glow-word">{word}</p>
      </div>
      <div className="relative h-24">{chart}</div>
    </article>
  );
}

/** A thin line through the points (0..1 each), with one point marked and labelled; the area under the line is a faint wash. */
export function GlowLine({ values, mark, markLabel, title }: { values: number[]; mark: number; markLabel: string; title: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => [4 + (index / (values.length - 1)) * 92, 86 - (value / max) * 66] as const);
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L96 96 L4 96 Z`;
  const [mx, my] = points[Math.min(points.length - 1, Math.max(0, mark))]!;
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title} className="absolute inset-0 size-full overflow-visible">
        <path d={area} fill="rgb(255 255 255 / 0.1)" />
        <path d={line} fill="none" stroke="white" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={mx} y1={my} x2={mx} y2="96" stroke="rgb(255 255 255 / 0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span aria-hidden className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgb(255_255_255/0.25)]" style={{ left: `${mx}%`, top: `${my}%` }} />
      <span aria-hidden className="glow-mark-label absolute -translate-x-1/2 -translate-y-[170%]" style={{ left: `${Math.min(88, Math.max(12, mx))}%`, top: `${my}%` }}>
        {markLabel}
      </span>
    </>
  );
}

/** Thin bars (0..1 each), the largest bright and labelled, the rest faint. */
export function GlowBars({ values, labels, title, markLabel }: { values: number[]; labels: string[]; title: string; markLabel: string }) {
  const max = Math.max(1, ...values);
  const top = values.indexOf(Math.max(...values));
  return (
    <ul role="img" aria-label={title} className="absolute inset-0 flex items-end gap-1.5">
      {values.map((value, index) => (
        <li key={labels[index] ?? index} title={`${labels[index]}: ${value}`} className="relative flex h-full min-w-0 flex-1 items-end">
          <span className={cn('w-full rounded-t-[6px] rounded-b-[2px]', index === top ? 'bg-white' : 'bg-white/28')} style={{ height: `${Math.max(6, (value / max) * 100)}%` }} />
          {index === top && <span className="glow-mark-label absolute -top-5 left-1/2 -translate-x-1/2">{markLabel}</span>}
        </li>
      ))}
    </ul>
  );
}
