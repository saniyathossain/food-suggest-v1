// Swaps that help: today's food that conditions restrict, and the better choices from its own group (the food page's swaps), on a
// river-teal band: "Instead of paratha → ruti, oats".
import { ArrowRight, Repeat } from '@/components/icons/page';
import { FoodThumb } from '@/components/FoodRow';
import { RowBone } from '@/components/kit/bones';
import { SectionTitle } from '@/components/kit/section';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { pickForToday } from '@/lib/plan';
import { onLink } from '@/lib/router';
import type { FoodDetail, FoodSearch } from '@/lib/types';

export function Swaps({ foods }: { foods: FoodSearch[] }) {
  const { t, lang } = useI18n();
  const restricted = foods.filter((food) => food.verdicts.some((entry) => entry.verdict === 'avoid' || entry.verdict === 'limit'));
  const food = pickForToday(restricted, 3);
  const { data } = useResource<FoodDetail>(food ? endpoints.food(food.slug, lang) : null);
  if (!food) return null;
  if (data && data.swaps.length === 0) return null;
  return (
    <section aria-labelledby="swaps-title" className="tone-ground rounded-2xl p-6 [--tone:var(--river)] sm:p-8">
      <SectionTitle icon={Repeat} id="swaps-title" title={t.home.swapsTitle} lead={t.food.swapsLead} accent="river" />
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)]">
        <a href={`/food/${food.slug}`} onClick={onLink} className="surface group flex items-center gap-3 rounded-xl p-3">
          <FoodThumb image={food.image} cutout={food.cutout} name={food.name} category={food.category} size="size-16" />
          <span className="grid">
            <small className="text-footnote text-muted-foreground">{t.home.insteadOf}</small>
            <strong className="text-headline">{food.name}</strong>
          </span>
        </a>
        <ArrowRight size={28} className="mx-auto rotate-90 text-river md:rotate-0" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {!data && [0, 1].map((index) => <li key={index}><RowBone /></li>)}
          {data?.swaps.slice(0, 4).map((swap) => (
            <li key={swap.slug}>
              <a href={`/food/${swap.slug}`} onClick={onLink} className="surface group flex items-center gap-3 rounded-xl p-3">
                <FoodThumb image={swap.image} cutout={swap.cutout} name={swap.name} category="" size="size-14" />
                <strong className="text-callout">{swap.name}</strong>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
