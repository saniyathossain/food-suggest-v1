// A tick-mark gauge (the "deal win rate" dial): a 240° arc of fine ticks, the lit ones up to the value, a soft rounded arc over them
// with a faint glow. The figure and its caption are the caller's children, centred inside. A meter for assistive tech. Pure SVG; the glow
// is one small drop-shadow, not animated, so it costs nothing while scrolling.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const CX = 60;
const CY = 62;
const R = 40;
const START = 150;
const SWEEP = 240;
const TICKS = 40;

const at = (degrees: number, radius: number) => {
  const angle = (degrees * Math.PI) / 180;
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
};

export function TickGauge({ value, color, label, children, className }: { value: number; color: string; label: string; children?: ReactNode; className?: string | undefined }) {
  const share = Math.max(0, Math.min(1, value));
  const from = at(START, R);
  const to = at(START + SWEEP, R);
  const length = (SWEEP * Math.PI * R) / 180;
  const arc = `M${from.x} ${from.y} A${R} ${R} 0 1 1 ${to.x} ${to.y}`;
  return (
    <div className={cn('relative aspect-[6/5] w-full max-w-[15rem]', className)}>
      <svg viewBox="0 0 120 100" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} className="size-full">
        {Array.from({ length: TICKS + 1 }, (_, index) => {
          const major = index % 5 === 0;
          const angle = START + (SWEEP * index) / TICKS;
          const inner = at(angle, R + 6);
          const outer = at(angle, R + (major ? 11 : 9));
          const lit = index / TICKS <= share + 0.0001 && share > 0;
          return <line key={index} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={lit ? color : 'currentColor'} strokeOpacity={lit ? 0.9 : 0.16} strokeWidth={major ? 1.1 : 0.7} strokeLinecap="round" />;
        })}
        <path d={arc} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - share)}
          className="gauge-arc tick-glow"
          style={{ ['--glow' as string]: color }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center text-center">{children}</div>
    </div>
  );
}
