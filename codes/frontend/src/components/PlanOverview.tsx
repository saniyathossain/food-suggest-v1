// The plan at a glance, before an account: from the same public engine as the full plan (POST /plan), for the choices just made.
// The three lists with their first few foods, the day's meal times and two timing tips; then what the full plan adds and the way to
// it (a free account; the choices made here are kept and become the first profile — Auth.tsx).
import { Check, Clock, Leaf, Lock } from '@/components/icons/page';
import { Sparkles } from '@/components/icons';
import { FoodThumb } from '@/components/FoodRow';
import { buttonClass } from '@/components/ui/button-styles';
import { clock, useI18n } from '@/lib/i18n';
import { usePlan } from '@/lib/plan';
import { onLink } from '@/lib/router';
import type { Profile } from '@/lib/types';

const LISTS = [
  { key: 'recommended', tile: 'var(--tint-mint)', dot: 'var(--recommended)' },
  { key: 'limit', tile: 'var(--tint-butter)', dot: 'var(--limit)' },
  { key: 'avoid', tile: 'var(--tint-blush)', dot: 'var(--avoid)' },
] as const;

export function PlanOverview({ draft }: { draft: Profile }) {
  const { t, lang, num } = useI18n();
  const { data, error } = usePlan(draft, lang);
  if (error) return <p className="text-subhead text-avoid-ink">{t.common.error}</p>;
  if (!data) {
    return (
      <div aria-busy="true" className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((index) => <span key={index} className="shimmer block h-44 rounded-[22px]" />)}
      </div>
    );
  }
  const tips = data.timing.do.slice(0, 2);
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h3 className="text-title-2">{t.overview.title}</h3>
        <p className="text-subhead text-muted-foreground">{data.profile.conditions.length > 0 ? t.overview.lead.replace('{list}', data.profile.conditions.map((item) => item.name).join(', ')) : t.plan.noConditions}</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {LISTS.map((list) => {
          const items = data.foods[list.key];
          return (
            <li key={list.key} className="pastel grid content-start gap-3 p-4" style={{ ['--tile' as string]: list.tile }}>
              <p className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-callout font-bold"><i className="size-2.5 rounded-full" style={{ background: list.dot }} /> {t.verdict[list.key]}</span>
                <span className="text-title-3 font-extrabold tabular-nums">{num(items.length)}</span>
              </p>
              <ul className="grid gap-1.5">
                {items.slice(0, 4).map((food) => (
                  <li key={food.slug} className="flex items-center gap-2.5 text-subhead">
                    <FoodThumb image={food.image} cutout={food.cutout} name={food.name} category={food.category} size="size-8" />
                    <span className="truncate font-medium">{food.name}</span>
                  </li>
                ))}
                {items.length === 0 && <li className="text-footnote">{t.overview.none}</li>}
                {items.length > 4 && <li className="text-footnote font-semibold">{t.overview.more.replace('{n}', num(items.length - 4))}</li>}
              </ul>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid content-start gap-2 rounded-[22px] border bg-card/60 p-4">
          <p className="flex items-center gap-2 text-callout font-bold"><Clock size={17} /> {t.overview.meals}</p>
          <ol className="flex flex-wrap gap-1.5">
            {data.meals.map((meal) => (
              <li key={meal.slug} className="rounded-full bg-muted px-3 py-1 text-footnote"><strong className="font-semibold">{clock(meal.time, lang)}</strong> · {meal.name}</li>
            ))}
          </ol>
        </div>
        <div className="grid content-start gap-2 rounded-[22px] border bg-card/60 p-4">
          <p className="flex items-center gap-2 text-callout font-bold"><Leaf size={17} /> {t.overview.tips}</p>
          <ul className="grid gap-1.5">
            {tips.map((tip) => (
              <li key={tip.title} className="flex gap-2 text-subhead"><Check size={16} className="mt-1 shrink-0 text-recommended-ink" /> {tip.title}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="promo grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-2">
          <p className="flex items-center gap-2 text-title-3 font-bold text-white"><Lock size={18} /> {t.overview.fullTitle}</p>
          <ul className="grid gap-1 text-subhead text-white/90 sm:grid-cols-2">
            {t.overview.fullList.split('|').map((line) => (
              <li key={line} className="flex gap-2"><Check size={16} className="mt-1 shrink-0" /> {line}</li>
            ))}
          </ul>
          <p className="text-footnote text-white/80">{t.overview.kept}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href="/register?next=/plan" onClick={onLink} className={buttonClass('default', 'lg')}>
            <Sparkles size={18} /> {t.overview.signUp}
          </a>
          <a href="/login?next=/plan" onClick={onLink} className="press inline-flex h-12 items-center rounded-full border border-white/70 px-5 text-callout font-semibold text-white hover:bg-white/10">
            {t.auth.signIn}
          </a>
        </div>
      </div>
    </div>
  );
}
