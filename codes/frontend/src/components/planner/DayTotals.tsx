// The day at a glance: calories eaten against the day's reference (a ring), protein / carbs / fat as three small bars, and the other
// meters (sugar, salt, fibre, iron…) as quiet rows that turn amber when a limit is passed. The reference is a typical adult's, not advice.
import { Donut } from '@/components/charts';
import { useI18n } from '@/lib/i18n';
import type { DayLog } from '@/lib/types';
import { cn } from '@/lib/utils';

const round = (value: number) => Math.round(value * 10) / 10;

export function DayTotals({ day }: { day: DayLog }) {
  const { t, num } = useI18n();
  const kcal = day.meters.find((meter) => meter.key === 'kcal');
  const left = kcal ? Math.round(kcal.target - kcal.amount) : null;
  const macros = [
    { key: 'protein', label: t.food.protein, value: day.totals.protein_g ?? 0, color: 'var(--river)' },
    { key: 'carbs', label: t.food.carbs, value: day.totals.carb_g ?? 0, color: 'var(--saffron)' },
    { key: 'fat', label: t.food.fat, value: day.totals.fat_g ?? 0, color: 'var(--coral)' },
  ];
  return (
    <section aria-label={t.planner.today} className="surface grid gap-6 rounded-[28px] p-5 sm:p-7 lg:grid-cols-[minmax(0,27rem)_1fr]">
      <div className="grid content-center justify-items-start gap-3">
        <Donut
          data={macros}
          total={num(Math.round(day.totals.kcal ?? 0))}
          center={t.food.kcal}
          format={(value) => `${num(round(value))} g`}
          ariaLabel={t.planner.today}
        />
        {left !== null && (
          <p className={cn('text-subhead font-semibold', left < 0 ? 'text-limit-ink' : 'text-recommended-ink')}>
            {left < 0 ? t.planner.over.replace('{n}', num(-left)) : t.planner.left.replace('{n}', num(left))}
          </p>
        )}
      </div>
      <div className="grid content-center gap-5">
        <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {day.meters.filter((meter) => meter.key !== 'kcal').map((meter) => (
            <li key={meter.key} className="grid gap-1">
              <p className="flex items-baseline justify-between text-footnote">
                <span className="text-muted-foreground">{t.planner.meters[meter.key]}</span>
                <span className={cn('tabular-nums', meter.over && 'font-semibold text-limit-ink')}>
                  {num(round(meter.amount))} / {num(round(meter.target))} {meter.unit}
                </span>
              </p>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className={cn('block h-full origin-left rounded-full', meter.over ? 'bg-limit' : meter.kind === 'goal' ? 'bg-[var(--river)]' : 'bg-[var(--brand)]')} style={{ width: '100%', transform: `scaleX(${Math.min(1, meter.share)})` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="text-caption text-muted-foreground">{day.note}</p>
      </div>
    </section>
  );
}
