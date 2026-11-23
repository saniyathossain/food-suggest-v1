// A radar (spider) chart: one axis per nutrient, rings at 25/50/75/100 %, the shape drawn from the centre. Values are shares (1 = the
// full reference); the shape is capped at the outer ring. Labels sit outside; a text alternative (the list of shares) is the caller's.
import { cn } from '@/lib/utils';

export type Axis = { key: string; label: string; value: number };

const CX = 100;
const CY = 100;
const R = 62;
const RINGS = [0.25, 0.5, 0.75, 1];

const point = (index: number, count: number, radius: number) => {
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle), cos: Math.cos(angle) };
};

export function Radar({ axes, color, ariaLabel, className }: { axes: Axis[]; color: string; ariaLabel: string; className?: string | undefined }) {
  const count = axes.length;
  const shape = axes.map((axis, index) => point(index, count, R * Math.max(0.02, Math.min(1, axis.value))));
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={ariaLabel} className={cn('mx-auto w-full max-w-[17rem] overflow-visible', className)}>
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, index) => { const p = point(index, count, R * ring); return `${p.x},${p.y}`; }).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeOpacity={ring === 1 ? 0.22 : 0.1}
          strokeDasharray={ring === 1 ? undefined : '2 3'}
        />
      ))}
      {axes.map((axis, index) => {
        const edge = point(index, count, R);
        const out = point(index, count, R + 13);
        const anchor = Math.abs(out.cos) < 0.3 ? 'middle' : out.cos > 0 ? 'start' : 'end';
        return (
          <g key={axis.key}>
            <line x1={CX} y1={CY} x2={edge.x} y2={edge.y} stroke="currentColor" strokeOpacity="0.1" />
            <text x={out.x} y={out.y} textAnchor={anchor} dominantBaseline="middle" className="fill-muted-foreground text-[9px] font-semibold">
              {axis.label}
            </text>
          </g>
        );
      })}
      <polygon points={shape.map((p) => `${p.x},${p.y}`).join(' ')} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.6" strokeLinejoin="round" className="radar-shape" />
      {shape.map((p, index) => (
        <circle key={axes[index]?.key} cx={p.x} cy={p.y} r="2.4" fill="var(--card)" stroke={color} strokeWidth="1.4" />
      ))}
    </svg>
  );
}
