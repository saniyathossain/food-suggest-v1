// Food lookup: search in English or Bangla, narrow by group or to what is in season now (adds &season=now to the request), each
// filter chip with its count. Results are photo cards; while a search or filter loads, cards-shaped skeletons hold the grid.
import { useDeferredValue, useEffect, useState } from 'react';
import { CategoryIcon, Search } from '@/components/icons';
import { Leaf, Droplet } from '@/components/icons/page';
import { EmptyState } from '@/components/journey/EmptyState';
import { FoodCard } from '@/components/FoodCard';
import { FoodGridBones } from '@/components/kit/bones';
import { ErrorBox } from '@/components/kit/loaderror';
import { VerdictBadge } from '@/components/Verdict';
import { endpoints, useResource } from '@/lib/api';
import { FilterChip } from '@/components/kit/filterchip';
import { RevealMore, useReveal } from '@/components/kit/reveal';
import { useI18n, useT } from '@/lib/i18n';
import type { Bootstrap, FoodSearch } from '@/lib/types';
import { tone } from '@/lib/utils';
import { groupTone } from '@/components/kit/artwork';
import { SortSelect } from '@/components/kit/sortselect';
import { FOOD_SORTS, foodOrder } from '@/lib/sorts';
import { BabyStages } from '@/components/food/BabyStages';
import { activeFilters, toggle, useFoodFilters } from '@/lib/foodfilters';

function useDebounced(value: string, delay: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

// at most three conditions listed (strictest first), the rest counted, so every card stays the same height
const STRICT = { avoid: 0, limit: 1, ok: 2, recommended: 3 } as const;
const SHOWN = 3;

function Verdicts({ food, boot }: { food: FoodSearch; boot: Bootstrap }) {
  const { t } = useI18n();
  const translate = useT();
  if (food.verdicts.length === 0) return <small className="mt-1.5 px-1 text-footnote text-muted-foreground">{t.foods.neutral}</small>;
  const conditions = new Map(boot.conditions.map((condition) => [condition.slug, condition]));
  const sorted = [...food.verdicts].sort((first, second) => STRICT[first.verdict] - STRICT[second.verdict]);
  const hidden = sorted.slice(SHOWN);
  return (
    <ul className="mt-1.5 grid gap-1 px-1">
      {sorted.slice(0, SHOWN).map((entry) => {
        const condition = conditions.get(entry.condition);
        return (
          <li key={entry.condition} title={entry.reason} className="flex items-center justify-between gap-2 text-footnote" style={tone(condition?.color ?? 'var(--leaf)')}>
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <i className="dot" /> {condition?.name ?? entry.condition}
            </span>
            <VerdictBadge verdict={entry.verdict} />
          </li>
        );
      })}
      {hidden.length > 0 && (
        <li className="text-caption font-semibold text-muted-foreground" title={hidden.map((entry) => conditions.get(entry.condition)?.name ?? entry.condition).join(', ')}>
          {translate('foods.moreConditions', hidden.length)}
        </li>
      )}
    </ul>
  );
}

export default function Foods({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const translate = useT();
  const [filters, setFilters, reset] = useFoodFilters();
  const { q: query, categories, subcategories, inSeason, lowGi, age, sort } = filters;
  const settled = useDebounced(query.trim(), 180);
  const { data, error } = useResource<FoodSearch[]>(endpoints.foods(lang, settled, '', inSeason));
  const results = useDeferredValue(data);
  const isLowGi = (food: FoodSearch) => food.gi !== null && food.gi <= 55;
  const inGroups = (food: FoodSearch) => categories.length === 0 || categories.includes(food.category);
  const inKinds = (food: FoodSearch) => subcategories.length === 0 || (food.subcategory !== null && subcategories.includes(food.subcategory));
  const suitsAge = (food: FoodSearch) => age === null || (food.age_from_months !== null && food.age_from_months <= age);
  const shown = results?.filter((food) => inGroups(food) && inKinds(food) && (!lowGi || isLowGi(food)) && suitsAge(food))?.sort(foodOrder[sort]);
  const reveal = useReveal(shown, `${shown?.length}${sort}`);
  // the counts on a chip are what that chip would show if you chose it now, with every other filter kept (so they move as you choose)
  const counts = new Map<string, number>();
  results?.filter((food) => (!lowGi || isLowGi(food))).forEach((food) => counts.set(food.category, (counts.get(food.category) ?? 0) + 1));
  const kindCount = (slug: string) => results?.filter((food) => food.subcategory === slug && inGroups(food) && (!lowGi || isLowGi(food))).length;
  const groups = boot.subcategories.filter((item) => categories.includes(item.category));
  const lowGiCount = results?.filter((food) => isLowGi(food) && inGroups(food) && inKinds(food)).length;
  const seasonCount = results?.filter((food) => food.in_season && inGroups(food) && inKinds(food) && (!lowGi || isLowGi(food))).length;
  const names = new Map(boot.categories.map((item) => [item.slug, item.name]));
  const on = activeFilters(filters);
  const pickCategory = (slug: string) => {
    const next = toggle(categories, slug);
    const keep = new Set(boot.subcategories.filter((item) => next.includes(item.category)).map((item) => item.slug));
    setFilters({ categories: next, subcategories: subcategories.filter((item) => keep.has(item)), ...(next.includes('baby') ? {} : { age: null }) });
  };

  return (
    <main className="page">
      <h1 className="text-large-title">{t.foods.title}</h1>
      <p className="mt-2 max-w-[60ch] text-callout text-muted-foreground">{t.foods.lead}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="field flex h-14 min-w-[16rem] flex-1 items-center gap-3 rounded-full px-5 shadow-sm">
          <Search size={22} className="text-muted-foreground" />
          <span className="sr-only">{t.foods.title}</span>
          <input type="search" value={query} onChange={(event) => setFilters({ q: event.target.value })} placeholder={t.foods.placeholder} className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-faint-foreground" />
        </label>
        <SortSelect label={t.list.sort} value={sort} onChange={(next) => setFilters({ sort: next })} options={FOOD_SORTS.map((item) => ({ value: item, label: t.list.sorts[item] }))} />
      </div>
      <div className="rail mt-4 gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.foods.filters}>
        <FilterChip on={inSeason} onClick={() => setFilters({ inSeason: !inSeason })} label={t.foods.inSeason} count={seasonCount}>
          <Leaf size={17} className="text-mango" />
        </FilterChip>
        <FilterChip on={lowGi} onClick={() => setFilters({ lowGi: !lowGi })} label={t.foods.lowGi} count={lowGiCount}>
          <Droplet size={17} className="text-leaf" />
        </FilterChip>
        <FilterChip on={categories.length === 0} onClick={() => setFilters({ categories: [], subcategories: [] })} label={t.foods.all} count={results?.filter((food) => !lowGi || isLowGi(food)).length} />
        {boot.categories.map((item) => (
          <FilterChip key={item.slug} on={categories.includes(item.slug)} onClick={() => pickCategory(item.slug)} label={item.name} color={groupTone(item.slug)} count={results ? counts.get(item.slug) ?? 0 : undefined}>
            <CategoryIcon slug={item.slug} size={17} />
          </FilterChip>
        ))}
      </div>
      {groups.length > 0 && (
        <div className="rail mt-2 gap-2 pb-1 sm:flex-wrap" role="group" aria-label={categories.map((slug) => names.get(slug) ?? '').join(', ')}>
          <FilterChip on={subcategories.length === 0} onClick={() => setFilters({ subcategories: [] })} label={t.foods.all} />
          {groups.map((item) => (
            <FilterChip key={item.slug} on={subcategories.includes(item.slug)} onClick={() => setFilters({ subcategories: toggle(subcategories, item.slug) })} label={item.name} count={kindCount(item.slug)} />
          ))}
        </div>
      )}
      {categories.includes('baby') && (
        <div className="mt-4">
          <BabyStages age={age} onPick={(next) => setFilters({ age: next })} />
        </div>
      )}
      {on > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-footnote text-muted-foreground">
          <span aria-live="polite">{translate('foods.filtersOn', on)}</span>
          <button type="button" onClick={reset} className="press inline-flex h-8 items-center rounded-full border px-3 font-semibold text-foreground hover:bg-accent">
            {t.foods.reset}
          </button>
        </p>
      )}
      <div className="mt-6">
        {error && <ErrorBox />}
        {!shown && !error && <FoodGridBones />}
        {shown && <p aria-live="polite" className="mb-3 text-footnote text-muted-foreground">{translate('foods.results', shown.length)}</p>}
        {shown?.length === 0 && (
          <EmptyState
            icon={Search}
            title={t.journey.empty.foodsTitle}
            lead={t.journey.empty.foodsLead}
            primary={{ label: t.foods.reset, onClick: reset }}
            secondary={{ label: t.journey.empty.conditions, href: '/' }}
          />
        )}
        {shown && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-8">
            {reveal.visible?.map((food) => (
              <FoodCard key={food.slug} food={food} category={names.get(food.category)} ratio="16 / 9" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 340px">
                <Verdicts food={food} boot={boot} />
              </FoodCard>
            ))}
          </div>
        )}
        <RevealMore {...reveal} />
      </div>
    </main>
  );
}
