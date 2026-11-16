// The plan's own parts: who it is for (a bar of pills), the day's meals (a shelf of photo cards, each food in it a link coloured by
// its verdict), and the food rules (lanes; a food the conditions disagree on says so).
import { Flag } from '@/components/kit/flag';
import { MealIcon, TriangleAlert } from '@/components/icons';
import { Leaf } from '@/components/icons/page';
import { Cutout } from '@/components/kit/cutout';
import { Photo } from '@/components/kit/photo';
import { FoodRow } from '@/components/FoodRow';
import { Lane, Lanes } from '@/components/Lanes';
import { verdictColor } from '@/components/Verdict';
import { clock, useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Bootstrap, Plan, Verdict } from '@/lib/types';
import { tone } from '@/lib/utils';

const pill = 'inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3.5 text-subhead font-semibold';

export function ProfileBar({ boot, data }: { boot: Bootstrap; data: Plan }) {
  const { t, num } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={pill}>
        <Flag code={data.profile.country} /> {boot.countries.find((country) => country.code === data.profile.country)?.name}
      </span>
      <span className={pill}>
        {num(data.profile.age)} {t.profile.years} · {t.ageGroup[data.profile.age_group]}
      </span>
      <span className={pill}>{t.gender[data.profile.gender]}</span>
      {data.profile.conditions.map((condition) => (
        <a key={condition.slug} href={`/condition/${condition.slug}`} onClick={onLink} className={`${pill} press hover:border-primary/40`} style={tone(condition.color)}>
          <i className="dot" /> {condition.name}
        </a>
      ))}
      {data.profile.conditions.length === 0 && <span className="text-subhead text-muted-foreground">{t.plan.noConditions}</span>}
    </div>
  );
}

export function PlanMeals({ data }: { data: Plan }) {
  const { t, lang } = useI18n();
  return (
    // a wrapping grid, not a sideways rail: the whole day is visible at once and no card runs off the page
    <ul aria-label={t.plan.day} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.meals.map((meal) => (
        <li key={meal.slug} className="surface overflow-hidden rounded-xl">
          {meal.cutout ? (
            <div className="group px-[12%] pt-[6%]">
              <Cutout src={meal.cutout} alt={meal.name} ratio="3 / 2" sizes="(max-width: 640px) 70vw, 280px" zoom />
            </div>
          ) : (
            <Photo src={meal.image} tone="#e8a33d" ratio="3 / 2" sizes="(max-width: 640px) 90vw, 400px" />
          )}
          <div className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <strong className="flex items-center gap-2 text-headline">
                <MealIcon slug={meal.slug} size={19} /> {meal.name}
              </strong>
              <span className="text-footnote font-semibold tabular-nums text-muted-foreground">{clock(meal.time, lang)}</span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {meal.items.map((item) => (
                <li key={item.slug}>
                  <a href={`/food/${item.slug}`} onClick={onLink} title={t.verdict[item.verdict]} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-footnote font-semibold hover:bg-accent" style={tone(verdictColor[item.verdict])}>
                    <i className="dot" /> {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}

const PLAN_LANES: Verdict[] = ['avoid', 'limit', 'recommended'];

export function PlanFoods({ data }: { data: Plan }) {
  const { t } = useI18n();
  const lists: Record<string, Plan['foods']['avoid']> = { avoid: data.foods.avoid, limit: data.foods.limit, recommended: data.foods.recommended };
  return (
    <Lanes columns={3}>
      {PLAN_LANES.map((verdict) => {
        const items = lists[verdict] ?? [];
        return (
          <Lane key={verdict} verdict={verdict} count={items.length}>
            {items.length === 0 && <li className="py-3 text-subhead text-muted-foreground">{verdict === 'recommended' ? '—' : t.plan.empty}</li>}
            {items.map((food) => (
              <FoodRow key={food.slug} slug={food.slug} name={food.name} image={food.image} cutout={food.cutout} category={food.category}>
                {food.best_way && (
                  <span className="inline-flex items-center gap-1 text-footnote font-semibold text-recommended-ink">
                    <Leaf size={13} /> {t.plan.bestWay}: {food.best_way}
                  </span>
                )}
                {food.conflict && (
                  <span className="inline-flex items-center gap-1 text-footnote font-semibold text-limit-ink">
                    <TriangleAlert size={14} /> {t.plan.conflict}
                  </span>
                )}
                {food.reasons.map((reason, index) => (
                  <span key={index} className="flex items-start gap-1.5 text-footnote text-muted-foreground" style={tone(reason.color)}>
                    <i className="dot mt-1.5" />
                    <span>
                      <b className="font-semibold text-foreground">{reason.condition}:</b> {reason.reason}
                    </span>
                  </span>
                ))}
              </FoodRow>
            ))}
          </Lane>
        );
      })}
    </Lanes>
  );
}
