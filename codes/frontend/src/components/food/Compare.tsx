// Every way of having a food side by side: one bar per variant, scaled to the largest, the chosen one filled in the brand colour and the
// rest quiet. A row is a button: it picks that variant for the page (nutrition, gallery). Energy by default; the switch swaps in fat.
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { FoodVariant } from '@/lib/types';
import { cn } from '@/lib/utils';

type Measure = 'kcal' | 'fat' | 'carbs' | 'protein';

const pick = (variant: FoodVariant, measure: Measure): number | null => {
  const n = variant.per_100g;
  return measure === 'kcal' ? n.kcal : measure === 'fat' ? n.fat_g : measure === 'carbs' ? n.carb_g : n.protein_g;
};

export function Compare({ variants, chosen, onChoose }: { variants: FoodVariant[]; chosen: string; onChoose: (slug: string) => void }) {
  const { t, num } = useI18n();
  const [measure, setMeasure] = useState<Measure>('kcal');
  const rows = variants.map((variant) => ({ variant, value: pick(variant, measure) }));
  const top = Math.max(1, ...rows.map((row) => row.value ?? 0));
  const unit = measure === 'kcal' ? t.food.kcal : 'g';
  const measures: { key: Measure; label: string }[] = [
    { key: 'kcal', label: t.food.kcal },
    { key: 'protein', label: t.food.protein },
    { key: 'carbs', label: t.food.carbs },
    { key: 'fat', label: t.food.fat },
  ];
  return (
    <div className="grid content-start gap-3 rounded-2xl border bg-muted/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-headline">{t.food.compare}</h3>
        <div role="group" aria-label={t.food.compare} className="flex gap-1 rounded-full bg-muted p-0.5">
          {measures.map((item) => (
            <button key={item.key} type="button" aria-pressed={measure === item.key} onClick={() => setMeasure(item.key)} className={cn('press h-7 rounded-full px-2.5 text-caption font-semibold transition-colors', measure === item.key ? 'bg-card text-foreground shadow-[var(--sh-xs)]' : 'text-muted-foreground hover:text-foreground')}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-caption text-muted-foreground">{t.food.compareLead}</p>
      <ul className="grid gap-1">
        {rows.map(({ variant, value }) => {
          const on = variant.slug === chosen;
          return (
            <li key={variant.slug}>
              <button type="button" onClick={() => onChoose(variant.slug)} aria-pressed={on} className={cn('press grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-accent', on && 'bg-card shadow-[var(--sh-xs)]')}>
                <span className={cn('truncate text-footnote', on ? 'font-bold' : 'font-medium text-muted-foreground')}>{variant.name}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className={cn('block h-full origin-left rounded-full transition-transform duration-700 ease-[var(--ease-out)]', on ? 'bg-[var(--brand)]' : 'bg-foreground/25')} style={{ width: '100%', transform: `scaleX(${value === null ? 0 : value / top})` }} />
                </span>
                <span className="min-w-[4.5rem] text-end text-footnote font-semibold tabular-nums">{value === null ? '—' : `${num(Math.round(value * 10) / 10)} ${unit}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
