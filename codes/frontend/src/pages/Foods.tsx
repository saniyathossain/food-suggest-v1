// Food lookup: search in English or Bangla, narrow by group or to what is in season now (adds &season=now to the request), each
// filter chip with its count. Results are photo cards; while a search or filter loads, cards-shaped skeletons hold the grid.
import { useDeferredValue, useEffect, useState } from 'react';
import { CategoryIcon, Search } from '@/components/icons';
import { Leaf, Droplet } from '@/components/icons/page';
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
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const pickCategory = (slug: string) => {
    setCategory(slug);
    setSubcategory('');
  };
  const [inSeason, setInSeason] = useState(false);
  const [lowGi, setLowGi] = useState(false);
  const settled = useDebounced(query.trim(), 180);
  const { data, error } = useResource<FoodSearch[]>(endpoints.foods(lang, settled, '', inSeason));
  const results = useDeferredValue(data);
  const counts = new Map<string, number>();
  results?.forEach((food) => counts.set(food.category, (counts.get(food.category) ?? 0) + 1));
  const shown = results?.filter(
    (food) => (!category || food.category === category) && (!subcategory || food.subcategory === subcategory) && (!lowGi || (food.gi !== null && food.gi <= 55)),
  );
  const reveal = useReveal(shown, shown?.length);
  const groups = boot.subcategories.filter((item) => item.category === category);
  const lowGiCount = results?.filter((food) => food.gi !== null && food.gi <= 55).length;
  const seasonCount = results?.filter((food) => food.in_season).length;
  const names = new Map(boot.categories.map((item) => [item.slug, item.name]));

  return (
    <main className="page">
      <h1 className="text-large-title">{t.foods.title}</h1>
      <p className="mt-2 max-w-[60ch] text-callout text-muted-foreground">{t.foods.lead}</p>
      <label className="field mt-6 flex h-14 items-center gap-3 rounded-full px-5 shadow-sm">
        <Search size={22} className="text-muted-foreground" />
        <span className="sr-only">{t.foods.title}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.foods.placeholder} className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-faint-foreground" />
      </label>
      <div className="rail mt-4 gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.foods.filters}>
        <FilterChip on={inSeason} onClick={() => setInSeason(!inSeason)} label={t.foods.inSeason} count={seasonCount}>
          <Leaf size={17} className="text-mango" />
        </FilterChip>
        <FilterChip on={lowGi} onClick={() => setLowGi(!lowGi)} label={t.foods.lowGi} count={lowGiCount}>
          <Droplet size={17} className="text-leaf" />
        </FilterChip>
        <FilterChip on={category === ''} onClick={() => pickCategory('')} label={t.foods.all} count={results?.length} />
        {boot.categories.map((item) => (
          <FilterChip key={item.slug} on={category === item.slug} onClick={() => pickCategory(item.slug)} label={item.name} count={results ? counts.get(item.slug) ?? 0 : undefined}>
            <CategoryIcon slug={item.slug} size={17} />
          </FilterChip>
        ))}
      </div>
      {groups.length > 0 && (
        <div className="rail mt-2 gap-2 pb-1 sm:flex-wrap" role="group" aria-label={names.get(category) ?? ''}>
          <FilterChip on={subcategory === ''} onClick={() => setSubcategory('')} label={t.foods.all} />
          {groups.map((item) => (
            <FilterChip key={item.slug} on={subcategory === item.slug} onClick={() => setSubcategory(item.slug)} label={item.name} count={results?.filter((food) => food.subcategory === item.slug).length} />
          ))}
        </div>
      )}
      <div className="mt-6">
        {error && <ErrorBox />}
        {!shown && !error && <FoodGridBones />}
        {shown && <p aria-live="polite" className="mb-3 text-footnote text-muted-foreground">{translate('foods.results', shown.length)}</p>}
        {shown?.length === 0 && <p className="surface-soft rounded-xl p-6 text-callout text-muted-foreground">{t.foods.none}</p>}
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
