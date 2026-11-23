// Recipes, FlavorFit's recipe screen: a filter sidebar on the left (search, then meal type and difficulty as a tree, the chosen
// item in a yellow pill; "fits my conditions" when a profile is saved), and on the right the violet banner with the collection's
// counts, a "Recommended" row (dishes none of your conditions avoids) and every recipe as cards. Search works in either language.
import { useDeferredValue } from 'react';
import { Search } from '@/components/icons';
import { ChefHat, Clock, Leaf, Youtube } from '@/components/icons/page';
import { FilterChip } from '@/components/kit/filterchip';
import { SortSelect } from '@/components/kit/sortselect';
import { RECIPE_SORTS, recipeOrder, type RecipeSort } from '@/lib/sorts';
import { toggle } from '@/lib/foodfilters';
import { EmptyState } from '@/components/journey/EmptyState';
import { RecipeListBones } from '@/components/kit/bones';
import { Carousel } from '@/components/kit/carousel';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { RevealMore, useReveal } from '@/components/kit/reveal';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { endpoints, useResource } from '@/lib/api';
import { useI18n, useT } from '@/lib/i18n';
import { usePersisted } from '@/lib/persisted';
import { usePrefs } from '@/lib/prefs';
import type { Difficulty } from '@/generated/Difficulty';
import type { RecipeCard as Card, RecipeKind } from '@/lib/types';
import { cn } from '@/lib/utils';

const KINDS: RecipeKind[] = ['main', 'side', 'breakfast', 'snack', 'drink'];
const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const SIZES = '(max-width: 640px) 78vw, (max-width: 1280px) 45vw, 320px';

const TIMES = [15, 30, 60];

export default function Recipes() {
  const { t, lang, num } = useI18n();
  const translate = useT();
  const { profile } = usePrefs();
  const mine = profile?.conditions ?? [];
  const { data, error } = useResource<Card[]>(endpoints.recipes(lang));
  const [query, setQuery] = usePersisted('pathya.recipes.q', '');
  const [kinds, setKinds] = usePersisted<RecipeKind[]>('pathya.recipes.kinds', []);
  const [levels, setLevels] = usePersisted<Difficulty[]>('pathya.recipes.levels', []);
  const [within, setWithin] = usePersisted('pathya.recipes.within', 0);
  const [video, setVideo] = usePersisted('pathya.recipes.video', false);
  const [forMe, setForMe] = usePersisted('pathya.recipes.forme', false);
  const [sort, setSort] = usePersisted<RecipeSort>('pathya.recipes.sort', 'quickest');
  const needle = useDeferredValue(query.trim().toLowerCase());
  const fits = (recipe: Card) => !recipe.fit.some((entry) => mine.includes(entry.condition.slug) && entry.verdict === 'avoid');
  const is = {
    kind: (recipe: Card) => kinds.length === 0 || kinds.includes(recipe.kind),
    level: (recipe: Card) => levels.length === 0 || levels.includes(recipe.difficulty),
    time: (recipe: Card) => within === 0 || recipe.minutes <= within,
    video: (recipe: Card) => !video || recipe.has_video,
    mine: (recipe: Card) => !forMe || fits(recipe),
    text: (recipe: Card) => !needle || `${recipe.title} ${recipe.summary}`.toLowerCase().includes(needle),
  };
  // a chip's count is what choosing it would show now, every other filter kept
  const count = (skip: keyof typeof is, extra: (recipe: Card) => boolean) => data?.filter((recipe) => extra(recipe) && (Object.keys(is) as (keyof typeof is)[]).every((key) => key === skip || is[key](recipe))).length;
  const shown = data?.filter((recipe) => Object.values(is).every((test) => test(recipe))).sort(recipeOrder[sort]);
  const recommended = data?.filter((recipe) => fits(recipe) && recipe.fit.every((entry) => entry.verdict !== 'avoid')).slice(0, 8) ?? [];
  const videos = data?.filter((recipe) => recipe.has_video).length ?? 0;
  const active = Number(needle !== '') + kinds.length + levels.length + Number(within > 0) + Number(video) + Number(forMe);
  const reveal = useReveal(shown, `${kinds.join()}${levels.join()}${within}${video}${forMe}${needle}${sort}`, 12);
  const filtering = active > 0;
  const reset = () => {
    setQuery('');
    setKinds([]);
    setLevels([]);
    setWithin(0);
    setVideo(false);
    setForMe(false);
  };
  return (
    <main className="page grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-10">
      <aside className="surface grid content-start gap-5 rounded-[28px] p-4 sm:p-5 xl:sticky xl:top-24" aria-label={t.foods.filters}>
        <label className="field flex h-11 items-center gap-2 rounded-full px-4">
          <Search size={18} className="text-muted-foreground" />
          <span className="sr-only">{t.recipes.title}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.recipes.search} className="min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
        </label>
        <SortSelect label={t.list.sort} value={sort} onChange={setSort} options={RECIPE_SORTS.map((item) => ({ value: item, label: t.list.sorts[item] }))} />
        <div className="grid gap-5 max-xl:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          <fieldset className="grid content-start gap-2">
            <legend className="mb-1 flex items-center gap-2 text-footnote font-bold text-muted-foreground"><ChefHat size={16} /> {t.recipes.mealType}</legend>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((item) => (
                <FilterChip key={item} on={kinds.includes(item)} onClick={() => setKinds(toggle(kinds, item) as RecipeKind[])} label={t.recipes.kinds[item]} count={count('kind', (recipe) => recipe.kind === item)} />
              ))}
            </div>
          </fieldset>
          <fieldset className="grid content-start gap-2">
            <legend className="mb-1 flex items-center gap-2 text-footnote font-bold text-muted-foreground"><ChefHat size={16} /> {t.recipes.difficultyTitle}</legend>
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((item) => (
                <FilterChip key={item} on={levels.includes(item)} onClick={() => setLevels(toggle(levels, item) as Difficulty[])} label={t.recipes.difficulty[item]} count={count('level', (recipe) => recipe.difficulty === item)} />
              ))}
            </div>
          </fieldset>
          <fieldset className="grid content-start gap-2">
            <legend className="mb-1 flex items-center gap-2 text-footnote font-bold text-muted-foreground"><Clock size={16} /> {t.list.time}</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((minutes) => (
                <FilterChip key={minutes} on={within === minutes} onClick={() => setWithin(within === minutes ? 0 : minutes)} label={t.list.under.replace('{n}', num(minutes))} count={count('time', (recipe) => recipe.minutes <= minutes)} />
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip on={video} onClick={() => setVideo(!video)} label={t.list.video} count={count('video', (recipe) => recipe.has_video)}>
              <Youtube size={16} />
            </FilterChip>
            {mine.length > 0 && (
              <FilterChip on={forMe} onClick={() => setForMe(!forMe)} label={t.recipes.forMe} color="var(--recommended)">
                <Leaf size={16} />
              </FilterChip>
            )}
          </div>
        </div>
        {active > 0 && (
          <p className="flex flex-wrap items-center gap-3 border-t pt-3 text-footnote text-muted-foreground">
            <span aria-live="polite">{translate('list.filtersOn', active)}</span>
            <button type="button" onClick={reset} className="press inline-flex h-8 items-center rounded-full border px-3 font-semibold text-foreground hover:bg-accent">
              {t.list.reset}
            </button>
          </p>
        )}
      </aside>
      <div className="grid min-w-0 gap-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="promo relative grid content-center gap-3 overflow-hidden p-6 sm:p-7">
            <div className="relative grid max-w-[34rem] gap-2">
              <h1 className="text-[clamp(28px,3.2vw,40px)] leading-[1.02] text-white">{t.recipes.bannerTitle}</h1>
              <p className="text-subhead text-white/85">{t.recipes.bannerLead}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {t.recipes.bannerTags.split('|').map((tag) => (
                  <li key={tag} className="rounded-full bg-white/18 px-3 py-1 text-caption font-semibold text-white">{tag}</li>
                ))}
              </ul>
            </div>
          </section>
          <section className="surface grid content-between gap-3 rounded-[28px] p-5" aria-label={t.recipes.collection}>
            <p className="flex items-center gap-2 text-subhead font-bold"><ChefHat size={17} /> {t.recipes.collection}</p>
            {!data && <div aria-busy="true" className="flex items-end gap-4"><span className="shimmer block h-12 w-14 rounded-lg" /><span className="shimmer block h-12 w-14 rounded-lg" /></div>}
            <div className={cn('flex items-end gap-4', !data && 'hidden')}>
              <p className="grid leading-none"><strong className="text-[34px] font-extrabold tabular-nums">{num(data?.length ?? 0)}</strong><span className="text-caption text-muted-foreground">{t.recipes.recipesWord}</span></p>
              <p className="grid leading-none"><strong className="flex items-center gap-1 text-[34px] font-extrabold tabular-nums">{num(videos)}</strong><span className="flex items-center gap-1 text-caption text-muted-foreground"><Youtube size={13} /> {t.recipes.videosWord}</span></p>
            </div>
            <div className="flex -space-x-2.5">
              {data?.slice(0, 5).map((recipe) => (
                <Photo key={recipe.slug} src={recipe.image} alt="" ratio="1 / 1" sizes="48px" className="size-9 rounded-full ring-2 ring-card" />
              ))}
            </div>
          </section>
        </div>
        {error && <ErrorBox />}
        {!data && !error && <RecipeListBones />}
        {data && !filtering && recommended.length > 0 && (
          <section aria-labelledby="recommended-title" className="grid gap-3">
            <h2 id="recommended-title" className="flex items-center gap-2.5 text-callout font-bold not-italic [font-family:var(--font-sans)]">
              <span className="grid size-8 place-items-center rounded-lg border bg-card"><Leaf size={17} /></span>
              {t.recipes.recommended}
            </h2>
            <Carousel label={t.recipes.recommended} previous={t.common.previous} next={t.common.next}>
              {recommended.map((recipe) => (
                <RecipeCard key={recipe.slug} recipe={recipe} mine={mine} sizes={SIZES} className="w-[min(78vw,290px)]" />
              ))}
            </Carousel>
          </section>
        )}
        {shown && (
          <section aria-labelledby="all-title" className="grid gap-3">
            <h2 id="all-title" className="flex items-center gap-2.5 text-callout font-bold not-italic [font-family:var(--font-sans)]">
              <span className="grid size-8 place-items-center rounded-lg border bg-card"><ChefHat size={17} /></span>
              {t.recipes.allRecipes}
              <span aria-live="polite" className="text-footnote font-medium text-muted-foreground">{t.recipes.count.replace('{n}', num(shown.length))}</span>
            </h2>
            {shown.length === 0 && (
              <EmptyState
                icon={ChefHat}
                title={t.journey.empty.recipesTitle}
                lead={t.journey.empty.recipesLead}
                primary={{ label: t.list.reset, onClick: reset }}
                secondary={{ label: t.journey.empty.foods, href: '/foods' }}
              />
            )}
            {shown.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3 2xl:gap-8">
                {reveal.visible?.map((recipe) => (
                  <RecipeCard key={recipe.slug} recipe={recipe} mine={mine} sizes={SIZES} />
                ))}
              </div>
            )}
            <RevealMore {...reveal} />
          </section>
        )}
      </div>
    </main>
  );
}
