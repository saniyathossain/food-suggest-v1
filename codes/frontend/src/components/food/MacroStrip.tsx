// A food's energy at a glance, for cards: kcal per 100 g of its usual form, a thin bar of where that energy comes from
// (protein and carbs 4 kcal/g, fat 9 kcal/g) and the three grams. The colours match the food page's nutrition ring.
import { useI18n } from '@/lib/i18n';
import type { Macros } from '@/lib/types';

const PARTS = [
  { key: 'protein_g', short: 'protein', perGram: 4, color: 'var(--river)' },
  { key: 'carb_g', short: 'carbs', perGram: 4, color: 'var(--saffron)' },
  { key: 'fat_g', short: 'fat', perGram: 9, color: 'var(--coral)' },
] as const;

const tenth = (value: number) => (value >= 10 ? Math.round(value) : Math.round(value * 10) / 10);

export function MacroStrip({ macros }: { macros: Macros }) {
  const { t, num } = useI18n();
  const grams = PARTS.map((part) => ({ ...part, grams: macros[part.key] ?? 0 }));
  const energy = grams.reduce((sum, part) => sum + part.grams * part.perGram, 0);
  const label = `${num(Math.round(macros.kcal))} ${t.foods.kcalPer} (${macros.form}): ${t.food.protein} ${num(tenth(grams[0]?.grams ?? 0))} g, ${t.food.carbs} ${num(tenth(grams[1]?.grams ?? 0))} g, ${t.food.fat} ${num(tenth(grams[2]?.grams ?? 0))} g`;
  return (
    <div role="img" aria-label={label} title={macros.form} className="mt-1.5 flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-3 py-2">
      <p className="grid shrink-0 leading-none">
        <strong className="text-[19px] font-extrabold tabular-nums">{num(Math.round(macros.kcal))}</strong>
        <span className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{t.foods.kcalPer}</span>
      </p>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <span aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
          {energy > 0 && grams.map((part) => <i key={part.key} style={{ width: `${((part.grams * part.perGram) / energy) * 100}%`, background: part.color }} />)}
        </span>
        <span aria-hidden className="flex justify-between gap-1 text-caption tabular-nums text-muted-foreground">
          {grams.map((part) => (
            <span key={part.key} className="inline-flex items-center gap-1">
              <i className="size-1.5 rounded-full" style={{ background: part.color }} />
              {t.foods.macroShort[part.short]} {num(tenth(part.grams))}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
