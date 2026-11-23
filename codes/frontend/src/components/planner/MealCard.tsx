// One meal of the day: its entries (picture, name, grams, calories, remove), what it adds up to, a few foods the plan suggests that
// still fit the day's calories, and the add-a-food sheet. Removing and adding go through the meal log API; the page reloads the day.
import { useState } from 'react';
import { FoodThumb } from '@/components/FoodRow';
import { Sparkles } from '@/components/icons';
import { Close } from '@/components/icons';
import { Plus } from '@/components/icons/page';
import { FoodPicker } from '@/components/planner/FoodPicker';
import { bring } from '@/components/planner/portion';
import { useI18n } from '@/lib/i18n';
import type { FoodSearch, MealEntry, MealTime, Verdict } from '@/lib/types';

type Props = {
  meal: MealTime;
  entries: MealEntry[];
  foods: FoodSearch[];
  verdicts: Map<string, Verdict>;
  suggestions: FoodSearch[];
  onAdd: (meal: MealTime, food: FoodSearch, grams: number) => Promise<unknown>;
  onRemove: (id: number) => Promise<unknown>;
};

export function MealCard({ meal, entries, foods, verdicts, suggestions, onAdd, onRemove }: Props) {
  const { t, num } = useI18n();
  const [open, setOpen] = useState(false);
  const kcal = entries.reduce((sum, entry) => sum + (entry.nutrients.kcal ?? 0), 0);
  return (
    <section aria-labelledby={`meal-${meal}`} className="surface grid content-start gap-4 rounded-[28px] p-4 sm:p-6">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id={`meal-${meal}`} className="text-title-3 font-bold not-italic [font-family:var(--font-sans)]">
          {t.planner.meals[meal]}
        </h2>
        <p className="numeral text-title-3">
          {num(Math.round(kcal))}
          <small> {t.food.kcal}</small>
        </p>
      </header>
      {entries.length === 0 && !open && <p className="text-subhead text-muted-foreground">{t.planner.emptyMeal}</p>}
      <ul className="grid">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 border-b py-2.5 last:border-0">
            <FoodThumb image={entry.image} cutout={null} name={entry.name} category="" size="size-11" />
            <span className="grid min-w-0 flex-1 leading-tight">
              <strong className="truncate text-subhead">{entry.name}</strong>
              <span className="text-caption text-muted-foreground tabular-nums">{num(entry.grams)} g</span>
            </span>
            <span className="text-subhead font-semibold tabular-nums">{entry.nutrients.kcal === null ? '—' : num(Math.round(entry.nutrients.kcal))}</span>
            <button type="button" onClick={() => void onRemove(entry.id)} aria-label={`${t.planner.remove}: ${entry.name}`} className="press grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-avoid-ink">
              <Close size={16} />
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <FoodPicker foods={foods} verdicts={verdicts} onAdd={(food, grams) => onAdd(meal, food, grams)} onClose={() => setOpen(false)} />
      ) : (
        <div className="grid gap-3">
          <button type="button" onClick={() => setOpen(true)} className="press inline-flex h-11 w-fit items-center gap-2 rounded-full border border-dashed px-4 text-subhead font-semibold text-primary hover:bg-primary-soft">
            <Plus size={17} /> {t.planner.addFood}
          </button>
          {suggestions.length > 0 && (
            <div className="grid gap-2">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                <Sparkles size={14} /> {t.planner.suggest}
              </p>
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((food) => (
                  <li key={food.slug}>
                    <button type="button" onClick={() => void onAdd(meal, food, 100)} className="chip press gap-2 py-1.5 ps-1.5">
                      <FoodThumb image={food.image} cutout={food.cutout} name={food.name} category={food.category} size="size-7" />
                      <span className="max-w-[10rem] truncate">{food.name}</span>
                      <span className="text-caption text-muted-foreground tabular-nums">+{num(Math.round(bring(food, 100)?.kcal ?? 0))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
