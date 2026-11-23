// The add-a-food sheet for one meal: a search box over the catalogue, each result with its calories per 100 g and the person's
// verdict dot, then a portion (chips and a number) with the calories it comes to before it is added.
import { useDeferredValue, useState } from 'react';
import { FoodThumb } from '@/components/FoodRow';
import { Search } from '@/components/icons';
import { Plus } from '@/components/icons/page';
import { ActionButton } from '@/components/ui/action-button';
import { bring, PORTIONS } from '@/components/planner/portion';
import { verdictColor } from '@/components/Verdict';
import { useI18n } from '@/lib/i18n';
import type { FoodSearch, Verdict } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { foods: FoodSearch[]; verdicts: Map<string, Verdict>; onAdd: (food: FoodSearch, grams: number) => Promise<unknown>; onClose: () => void };

export function FoodPicker({ foods, verdicts, onAdd, onClose }: Props) {
  const { t, num } = useI18n();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<FoodSearch | null>(null);
  const [grams, setGrams] = useState(100);
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const shown = foods.filter((food) => food.macros && (deferred === '' || food.name.toLowerCase().includes(deferred) || food.slug.includes(deferred))).slice(0, 24);
  const portion = bring(chosen ?? undefined, grams);
  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2 rounded-full border bg-background px-3.5">
        <Search size={17} className="text-muted-foreground" />
        <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.planner.search} className="h-11 min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
        <button type="button" onClick={onClose} className="press h-8 rounded-full px-3 text-footnote font-semibold text-muted-foreground hover:bg-accent">
          {t.planner.close}
        </button>
      </div>
      {!chosen && (
        <ul className="grid max-h-80 gap-1 overflow-y-auto overscroll-contain sm:grid-cols-2" data-lenis-prevent>
          {shown.map((food) => (
            <li key={food.slug}>
              <button type="button" onClick={() => setChosen(food)} className="press flex w-full items-center gap-3 rounded-xl p-2 text-start hover:bg-accent">
                <FoodThumb image={food.image} cutout={food.cutout} name={food.name} category={food.category} size="size-11" />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <strong className="truncate text-subhead">{food.name}</strong>
                  <span className="text-caption text-muted-foreground tabular-nums">{num(Math.round(food.macros?.kcal ?? 0))} {t.food.kcal} · 100 g</span>
                </span>
                {verdicts.get(food.slug) && <i className="dot" style={{ background: verdictColor[verdicts.get(food.slug) as Verdict] }} />}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="p-4 text-subhead text-muted-foreground sm:col-span-2">{t.planner.noFood}</li>}
        </ul>
      )}
      {chosen && (
        <div className="grid gap-3 rounded-xl bg-muted/50 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <FoodThumb image={chosen.image} cutout={chosen.cutout} name={chosen.name} category={chosen.category} size="size-14" />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-callout">{chosen.name}</strong>
              <button type="button" onClick={() => setChosen(null)} className="text-footnote font-semibold text-primary hover:underline">
                {t.planner.change}
              </button>
            </div>
            <p className="numeral text-title-2">
              {num(Math.round(portion?.kcal ?? 0))}
              <small> {t.food.kcal}</small>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.planner.portion}>
            {PORTIONS.map((size) => (
              <button key={size} type="button" aria-pressed={grams === size} onClick={() => setGrams(size)} className={cn('chip press', grams === size && 'chip-on')}>
                {num(size)} g
              </button>
            ))}
            <label className="ms-auto flex items-center gap-2 text-footnote text-muted-foreground">
              <span className="sr-only">{t.planner.portion}</span>
              <input type="number" min={1} max={3000} value={grams} onChange={(event) => setGrams(Math.min(3000, Math.max(1, Number(event.target.value) || 1)))} className="field h-9 w-24 text-center tabular-nums" />
              g
            </label>
          </div>
          <ActionButton icon={Plus} onClick={() => onAdd(chosen, grams).then(() => { setChosen(null); setQuery(''); })} className="w-fit">
            {t.planner.add}
          </ActionButton>
        </div>
      )}
    </div>
  );
}
