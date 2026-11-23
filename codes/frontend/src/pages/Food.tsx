// One food: its head (photo, group, season, imported, verdict chips), nutrition per 100 g by type, the verdict for every condition
// with the reason, the meals that suggest it, better swaps from the same group, and the sources behind the verdicts.
import { useState } from 'react';
import { Icon, MealIcon, Utensils, VerdictIcon } from '@/components/icons';
import { Clock, Repeat, Stethoscope } from '@/components/icons/page';
import { Crumbs } from '@/components/journey/Crumbs';
import { PlanNext } from '@/components/journey/NextStep';
import { LinkedWith } from '@/components/links/LinkedWith';
import { FoodHero } from '@/components/food/FoodHero';
import { Nutrition } from '@/components/food/Nutrition';
import { FoodThumb } from '@/components/FoodRow';
import { FoodBones } from '@/components/kit/routeskeleton';
import { ErrorBox } from '@/components/kit/loaderror';
import { SectionTitle } from '@/components/kit/section';
import { MotionRoot } from '@/components/motion';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { Fineprint } from '@/components/Sources';
import { VerdictBadge, verdictColor } from '@/components/Verdict';
import { endpoints, useResource } from '@/lib/api';
import { clock, useI18n, useT } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { onLink } from '@/lib/router';
import type { FoodDetail } from '@/lib/types';
import { tone } from '@/lib/utils';

function ByCondition({ data }: { data: FoodDetail }) {
  const { t } = useI18n();
  if (data.verdicts.length === 0) return null;
  return (
    <section>
      <SectionTitle icon={Stethoscope} title={t.food.byCondition} accent="leaf" />
      <ul className="grid gap-3 md:grid-cols-2">
        {data.verdicts.map((entry) => (
          <li key={entry.condition.slug}>
            <a href={`/condition/${entry.condition.slug}`} onClick={onLink} className="surface flex h-full gap-4 rounded-xl p-4" style={tone(verdictColor[entry.verdict])}>
              <span className="tone-soft grid size-10 shrink-0 place-items-center rounded-md">
                <VerdictIcon verdict={entry.verdict} size={20} />
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="tile size-6 rounded-full" style={tone(entry.condition.color)}>
                    <Icon name={entry.condition.icon} size={13} />
                  </span>
                  <strong className="text-headline">{entry.condition.name}</strong>
                  <VerdictBadge verdict={entry.verdict} />
                </span>
                <small className="text-subhead text-muted-foreground">{entry.reason}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Meals({ data }: { data: FoodDetail }) {
  const { t, lang } = useI18n();
  if (data.meal_slots.length === 0) return null;
  return (
    <section>
      <SectionTitle icon={Clock} title={t.food.inMeals} accent="mango" />
      <ul className="flex flex-wrap gap-2">
        {data.meal_slots.map((slot) => (
          <li key={slot.slug} className="chip pl-3">
            <MealIcon slug={slot.slug} size={18} /> {slot.name} · <span className="tabular-nums text-muted-foreground">{clock(slot.time, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SwapList({ data }: { data: FoodDetail }) {
  const { t } = useI18n();
  const translate = useT();
  if (data.swaps.length === 0) return null;
  return (
    <section className="tone-ground rounded-2xl p-5 [--tone:var(--river)] sm:p-7">
      <SectionTitle icon={Repeat} title={t.food.swaps} lead={t.food.swapsLead} accent="river" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.swaps.map((swap) => (
          <li key={swap.slug}>
            <a href={`/food/${swap.slug}`} onClick={onLink} className="surface group flex items-center gap-3 rounded-xl p-3">
              <FoodThumb image={swap.image} cutout={swap.cutout} name={swap.name} category="" size="size-16" />
              <span className="grid">
                <strong className="text-headline">{swap.name}</strong>
                <small className="text-footnote text-muted-foreground">{translate('food.recommendedFor', swap.recommended_for)}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** An API from before nutrition and seasons (a server not yet redeployed) answers without these fields: read them as empty. */
function withDefaults(raw: FoodDetail | undefined): FoodDetail | undefined {
  if (!raw) return undefined;
  const partial = raw as Partial<FoodDetail> & FoodDetail;
  return { ...raw, season: partial.season ?? [], variants: partial.variants ?? [], photos: partial.photos ?? [], in_season: partial.in_season ?? false, origin: partial.origin ?? 'local' };
}

export default function Food({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const { profile } = usePrefs();
  const resource = useResource<FoodDetail>(endpoints.food(slug, lang));
  const data = withDefaults(resource.data);
  const error = resource.error;
  // the way of cooking in view, shared by the nutrition panel and the hero's pictures ('' = the food's default)
  const [chosen, setChosen] = useState('');
  const variant = chosen || data?.variants.find((item) => item.is_default)?.slug || data?.variants[0]?.slug || '';
  return (
    <MotionRoot>
      <main className="page">
        <Crumbs trail={[{ href: '/foods', label: t.nav.foods }]} here={data?.name} />
        {error && <ErrorBox {...(error.status === 404 ? { message: t.food.missing } : {})} />}
        {!data && !error && <FoodBones />}
        {data && (
          <div className="grid gap-12">
            <FoodHero data={data} variant={variant} />
            <Nutrition key={data.slug} variants={data.variants} bestWay={data.best_way} glycemic={data.glycemic} chosen={variant} setChosen={setChosen} />
            <ByCondition data={data} />
            <Meals data={data} />
            <SwapList data={data} />
            {data.recipes.length > 0 && (
              <section className="grid gap-4">
                <SectionTitle icon={Utensils} title={t.recipes.withFood} accent="saffron" className="mb-0" />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.recipes.map((recipe) => (
                    <RecipeCard key={recipe.slug} recipe={recipe} mine={profile?.conditions ?? []} sizes="(max-width: 640px) 100vw, 440px" />
                  ))}
                </div>
              </section>
            )}
            <LinkedWith from={`food:${data.slug}`} />
            <PlanNext kind="food" />
            <Fineprint items={data.sources} />
          </div>
        )}
      </main>
    </MotionRoot>
  );
}
