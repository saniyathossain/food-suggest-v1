// Recipes, FlavorFit's recipe screen: a filter sidebar on the left (search, then meal type and difficulty as a tree, the chosen
// item in a yellow pill; "fits my conditions" when a profile is saved), and on the right the violet banner with the collection's
// counts, a "Recommended" row (dishes none of your conditions avoids) and every recipe as cards. Search works in either language.
import { useDeferredValue, useState } from 'react';
import { Search } from '@/components/icons';
import { ChefHat, Leaf, Youtube } from '@/components/icons/page';
import { RecipeListBones } from '@/components/kit/bones';
import { Carousel } from '@/components/kit/carousel';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { RevealMore, useReveal } from '@/components/kit/reveal';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import type { Difficulty } from '@/generated/Difficulty';
import type { RecipeCard as Card, RecipeKind } from '@/lib/types';
import { cn } from '@/lib/utils';

const KINDS: RecipeKind[] = ['main', 'side', 'breakfast', 'snack', 'drink'];
const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const SIZES = '(max-width: 640px) 78vw, (max-width: 1280px) 45vw, 320px';

function TreeItem({ on, label, count, onClick }: { on: boolean; label: string; count?: number | undefined; onClick: () => void }) {
  const { num } = useI18n();
  return (
    <li className="relative pl-5 before:absolute before:left-1.5 before:top-0 before:h-1/2 before:w-2.5 before:rounded-bl-md before:border-b before:border-l before:border-border">
      <button type="button" aria-pressed={on} onClick={onClick} className={cn('press flex w-full cursor-pointer items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-subhead transition-colors', on ? 'bg-cta font-bold text-cta-ink' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
        <span className="truncate">{label}</span>
        {count !== undefined && <span className={cn('rounded-full px-1.5 text-caption font-bold tabular-nums', on ? 'bg-black/10' : 'bg-[var(--tint-blush)] text-avoid-ink')}>{num(count)}</span>}
      </button>
    </li>
  );
}

export default function Recipes() {
  const { t, lang, num } = useI18n();
  const { profile } = usePrefs();
  const mine = profile?.conditions ?? [];
  const { data, error } = useResource<Card[]>(endpoints.recipes(lang));
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<RecipeKind | ''>('');
  const [level, setLevel] = useState<Difficulty | ''>('');
  const [forMe, setForMe] = useState(false);
  const needle = useDeferredValue(query.trim().toLowerCase());
  const fits = (recipe: Card) => !recipe.fit.some((entry) => mine.includes(entry.condition.slug) && entry.verdict === 'avoid');
  const shown = data?.filter(
    (recipe) => (!kind || recipe.kind === kind) && (!level || recipe.difficulty === level) && (!forMe || fits(recipe)) && (!needle || `${recipe.title} ${recipe.summary}`.toLowerCase().includes(needle)),
  );
  const recommended = data?.filter((recipe) => fits(recipe) && recipe.fit.every((entry) => entry.verdict !== 'avoid')).slice(0, 8) ?? [];
  const videos = data?.filter((recipe) => recipe.has_video).length ?? 0;
  const reveal = useReveal(shown, `${kind}${level}${forMe}${needle}`, 12);
  const filtering = Boolean(kind || level || forMe || needle);
  return (
    <main className="page grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start xl:gap-10">
      <aside className="surface grid content-start gap-4 rounded-[28px] p-4 xl:sticky xl:top-24" aria-label={t.foods.filters}>
        <label className="field flex h-11 items-center gap-2 rounded-full px-4">
          <Search size={18} className="text-muted-foreground" />
          <span className="sr-only">{t.recipes.title}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.recipes.search} className="min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
        </label>
        <div className="grid gap-4 max-xl:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 px-1 text-subhead font-bold"><ChefHat size={17} /> {t.recipes.mealType}</p>
            <ul className="grid gap-0.5">
              <TreeItem on={kind === ''} label={t.recipes.all} count={data?.length} onClick={() => setKind('')} />
              {KINDS.map((item) => (
                <TreeItem key={item} on={kind === item} label={t.recipes.kinds[item]} count={data?.filter((recipe) => recipe.kind === item).length} onClick={() => setKind(item)} />
              ))}
            </ul>
          </div>
          <div className="grid gap-1">
            <p className="flex items-center gap-2 px-1 text-subhead font-bold"><ChefHat size={17} /> {t.recipes.difficultyTitle}</p>
            <ul className="grid gap-0.5">
              <TreeItem on={level === ''} label={t.recipes.any} onClick={() => setLevel('')} />
              {LEVELS.map((item) => (
                <TreeItem key={item} on={level === item} label={t.recipes.difficulty[item]} count={data?.filter((recipe) => recipe.difficulty === item).length} onClick={() => setLevel(item)} />
              ))}
            </ul>
          </div>
          {mine.length > 0 && (
            <button type="button" aria-pressed={forMe} onClick={() => setForMe(!forMe)} className={cn('press flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-subhead font-semibold transition-colors', forMe ? 'bg-cta text-cta-ink' : 'bg-muted hover:bg-accent')}>
              <Leaf size={17} /> {t.recipes.forMe}
            </button>
          )}
        </div>
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
            {shown.length === 0 && <p className="surface-soft rounded-xl p-6 text-callout text-muted-foreground">{t.recipes.none}</p>}
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
