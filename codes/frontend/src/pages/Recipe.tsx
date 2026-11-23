// One recipe, FlavorFit's recipe page: a white sheet with the dish photo inset on the left and the title, meta chips (kind,
// time, servings, difficulty in chef hats), summary and condition fit on the right; the cooking video (our photo as poster,
// YouTube only when pressed, then a floating mini player when you scroll on); ingredients as tiles you tick off while
// cooking; the method as numbered step cards; tips on a mint card. Nothing here is invented: every value is the recipe's.
import { useState } from 'react';
import { Photo } from '@/components/kit/photo';
import { ErrorBox } from '@/components/kit/loaderror';
import { PageBones } from '@/components/kit/routeskeleton';
import { VideoPlayer } from '@/components/kit/video';
import { Check, ChefHat, Clock, Leaf, ListChecks, People, Youtube } from '@/components/icons/page';
import { Utensils } from '@/components/icons';
import { Disclaimer } from '@/components/Sources';
import { VerdictBadge } from '@/components/Verdict';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { Crumbs } from '@/components/journey/Crumbs';
import { PlanNext } from '@/components/journey/NextStep';
import { onLink } from '@/lib/router';
import type { Recipe as RecipeData } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

const HATS = { easy: 1, medium: 2, hard: 3 } as const;
const HAT_TILE = { easy: 'var(--tint-mint)', medium: 'var(--tint-butter)', hard: 'var(--tint-blush)' } as const;

export const metaChip = 'inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-footnote font-semibold text-foreground/80';

export function Difficulty({ level }: { level: RecipeData['difficulty'] }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-footnote font-semibold text-[var(--tint-ink)]" style={{ background: HAT_TILE[level] }}>
      <span className="flex -space-x-1" aria-hidden>
        {Array.from({ length: HATS[level] }, (_, index) => (
          <ChefHat key={index} size={14} />
        ))}
      </span>
      {t.recipes.difficulty[level]}
    </span>
  );
}

function Fit({ data }: { data: RecipeData }) {
  const { t } = useI18n();
  const { profile } = usePrefs();
  const mine = profile?.conditions ?? [];
  if (data.fit.length === 0) return null;
  const ordered = [...data.fit].sort((left, right) => Number(mine.includes(right.condition.slug)) - Number(mine.includes(left.condition.slug)));
  return (
    <div className="grid gap-2">
      <p className="text-footnote font-semibold text-muted-foreground">{t.recipes.fit}</p>
      <ul className="flex flex-wrap gap-1.5">
        {ordered.map((entry) => (
          <li key={entry.condition.slug} className={cn('inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-2.5 pr-1 text-footnote font-semibold', mine.includes(entry.condition.slug) && 'border-foreground')} style={tone(entry.condition.color)} title={entry.verdict !== 'recommended' && entry.verdict !== 'ok' ? `${t.recipes.because} ${entry.because}` : undefined}>
            <i className="dot" /> {entry.condition.name} <VerdictBadge verdict={entry.verdict} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ingredients({ data }: { data: RecipeData }) {
  const { t, num } = useI18n();
  const [done, setDone] = useState<number[]>([]);
  const flip = (index: number) => setDone((now) => (now.includes(index) ? now.filter((item) => item !== index) : [...now, index]));
  return (
    <section aria-labelledby="ingredients-title" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="ingredients-title" className="flex items-center gap-2.5 text-title-2">
          <span className="grid size-9 place-items-center rounded-xl border bg-card text-foreground"><ListChecks size={18} /></span>
          {t.recipes.ingredients}
        </h2>
        <p className="text-footnote font-semibold text-muted-foreground" aria-live="polite">
          {t.recipes.ticked.replace('{n}', num(done.length)).replace('{m}', num(data.ingredients.length))}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {data.ingredients.map((item, index) => {
          const ticked = done.includes(index);
          return (
            <li key={`${item.item}${index}`}>
              <button type="button" role="checkbox" aria-checked={ticked} onClick={() => flip(index)} className={cn('press grid h-full w-full cursor-pointer content-between gap-3 rounded-[20px] border p-3.5 text-left transition-colors', ticked ? 'border-transparent bg-[var(--tint-mint)] text-[var(--tint-ink)]' : 'bg-card hover:border-foreground/25')}>
                <span className={cn('grid size-6 place-items-center rounded-full border-2 transition-colors', ticked ? 'border-foreground bg-ink text-ink-foreground' : 'border-border')}>
                  {ticked && <Check size={13} strokeWidth={2.4} />}
                </span>
                <span className="grid gap-0.5">
                  <strong className={cn('text-callout font-bold', ticked && 'line-through decoration-2')}>{item.amount}</strong>
                  <span className="text-footnote text-muted-foreground">{item.item}</span>
                </span>
              </button>
              {item.food && (
                <a href={`/food/${item.food}`} onClick={onLink} className="mt-1 inline-block px-1 text-caption font-semibold text-primary hover:underline">
                  {item.food_name ?? item.item}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Steps({ data }: { data: RecipeData }) {
  const { t, num } = useI18n();
  return (
    <section aria-labelledby="steps-title" className="grid gap-4">
      <h2 id="steps-title" className="flex items-center gap-2.5 text-title-2">
        <span className="grid size-9 place-items-center rounded-xl border bg-card text-foreground"><Utensils size={18} /></span>
        {t.recipes.steps}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.steps.map((step, index) => (
          <li key={step} className="surface grid content-start gap-3 rounded-[24px] p-5">
            <span className="flex items-center justify-between gap-3">
              <span className="text-caption font-semibold text-muted-foreground">{t.recipes.stepOf.replace('{n}', num(index + 1)).replace('{m}', num(data.steps.length))}</span>
              <span className="grid size-9 place-items-center rounded-full bg-ink text-subhead font-extrabold text-ink-foreground">{num(index + 1)}</span>
            </span>
            <p className="text-callout leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Recipe({ slug }: { slug: string }) {
  const { t, lang, num } = useI18n();
  const { data, error } = useResource<RecipeData>(endpoints.recipe(slug, lang));
  if (error) return <main className="page"><ErrorBox message={error.message} /></main>;
  if (!data) return <PageBones shape="recipe" />;
  return (
    <main className="page grid grid-cols-[minmax(0,1fr)] gap-10">
      <Crumbs trail={[{ href: '/recipes', label: t.nav.recipes }]} here={data.title} />
      <header className="surface grid gap-6 rounded-[32px] p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
        <Photo src={data.image} alt={data.title} eager ratio="4 / 3" sizes="(max-width: 1024px) 100vw, 620px" tone="#e8a33d" className="rounded-[24px]" />
        <div className="grid content-center gap-5 px-2 pb-3 lg:px-0 lg:py-4 lg:pr-6">
          <h1 className="text-display">{data.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            <span className={metaChip}><Utensils size={15} /> {t.recipes.kinds[data.kind]}</span>
            <span className={metaChip}><Clock size={15} /> {num(data.minutes)} {t.recipes.minutes}</span>
            <span className={metaChip}><People size={15} /> {t.recipes.serves} {num(data.servings)}</span>
            <Difficulty level={data.difficulty} />
          </div>
          <p className="max-w-[56ch] text-body text-muted-foreground">{data.summary}</p>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-subhead">
            <div className="flex items-baseline gap-1.5"><dd className="font-extrabold tabular-nums">{num(data.prep_minutes)} {t.recipes.minutes}</dd><dt className="text-muted-foreground">{t.recipes.prep}</dt></div>
            <div className="flex items-baseline gap-1.5"><dd className="font-extrabold tabular-nums">{num(data.cook_minutes)} {t.recipes.minutes}</dd><dt className="text-muted-foreground">{t.recipes.cook}</dt></div>
            <div className="flex items-baseline gap-1.5"><dd className="font-extrabold tabular-nums">{num(data.ingredients.length)}</dd><dt className="text-muted-foreground">{t.recipes.ingredients}</dt></div>
          </dl>
          <Fit data={data} />
        </div>
      </header>
      {data.video_url && (
        <section aria-labelledby="video-title" className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <VideoPlayer url={data.video_url} title={data.title} channel={data.video_channel} poster={data.image} />
          <div className="order-first grid content-start gap-2 lg:order-none lg:gap-3 lg:pt-2">
            <h2 id="video-title" className="flex items-center gap-2.5 text-title-2">
              <span className="grid size-9 place-items-center rounded-xl border bg-card text-foreground"><Youtube size={18} /></span>
              {t.video.label}
            </h2>
            <p className="text-subhead text-muted-foreground">{t.video.note}</p>
          </div>
        </section>
      )}
      <Ingredients data={data} />
      <Steps data={data} />
      {data.tips.length > 0 && (
        <section aria-labelledby="tips-title" className="pastel grid gap-3 p-6 [--tile:var(--tint-mint)] sm:p-7">
          <h2 id="tips-title" className="flex items-center gap-2 text-title-3">
            <Leaf size={20} /> {t.recipes.tips}
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {data.tips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-subhead">
                <Check size={17} className="mt-0.5 shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </section>
      )}
      <PlanNext kind="recipe" />
      <Disclaimer />
    </main>
  );
}
