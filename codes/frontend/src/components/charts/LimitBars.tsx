// Bars against a limit: each row is a share of a daily limit; the bar runs to the dashed limit line, and anything past it is hatched in
// the warning colour (the "over the limit" stretch). The scale ends at 150 % of the limit. Scaled with transform, so it stays on the
// compositor. The numbers are printed beside the bars, so nothing depends on colour alone.
export type LimitRow = { key: string; label: string; value: number; display: string; over: string };

const SCALE = 1.5;

export function LimitBars({ rows, limitLabel, className }: { rows: LimitRow[]; limitLabel: string; className?: string | undefined }) {
  return (
    <ul className={className ?? 'grid gap-4'}>
      {rows.map((row) => {
        const filled = Math.min(row.value, 1) / SCALE;
        const overshoot = Math.max(0, Math.min(row.value, SCALE) - 1) / SCALE;
        return (
          <li key={row.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-subhead">
              <span className="font-semibold">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.display}
                {row.value > 1 && <strong className="ms-1.5 font-semibold text-avoid-ink">{row.over}</strong>}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              <span className="absolute inset-y-0 start-0 w-full origin-left rounded-full bg-[var(--brand)] transition-transform duration-700 ease-[var(--ease-out)]" style={{ transform: `scaleX(${filled})` }} />
              {overshoot > 0 && <span className="limit-hatch absolute inset-y-0" style={{ insetInlineStart: `${(1 / SCALE) * 100}%`, width: `${overshoot * 100}%` }} />}
              <span aria-hidden className="absolute inset-y-0 border-s border-dashed border-foreground/40" style={{ insetInlineStart: `${(1 / SCALE) * 100}%` }} />
            </div>
          </li>
        );
      })}
      <li aria-hidden className="text-caption text-muted-foreground">{limitLabel}</li>
    </ul>
  );
}
