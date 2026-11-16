// Other plates for each meal: balanced options built from the meal's foods (one per food group, none marked avoid), as many
// as the tier allows. Each plate is a row of food chips that link to the food.
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { MealOptions, PersonalPlan } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONE = { avoid: 'bg-avoid/12', limit: 'bg-limit/15', ok: 'bg-muted', recommended: 'bg-recommended/14' } as const;

export function Alternatives({ plan }: { plan: PersonalPlan }) {
  const { t, num } = useI18n();
  const named = new Map(plan.plan.meals.map((meal) => [meal.slug, meal]));
  const rows = plan.alternatives.filter((row: MealOptions) => row.options.length > 0);
  if (rows.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((row) => (
        <section key={row.slot} className="surface grid content-start gap-3 rounded-2xl p-4">
          <h3 className="text-headline">{named.get(row.slot)?.name ?? row.slot}</h3>
          <ol className="grid gap-2">
            {row.options.map((plate, index) => (
              <li key={plate.map((item) => item.slug).join('-')} className="flex flex-wrap items-center gap-1.5">
                <span className="numeral w-14 text-caption text-muted-foreground">
                  {t.alternatives.option} {num(index + 1)}
                </span>
                {plate.map((item) => (
                  <a key={item.slug} href={`/food/${item.slug}`} onClick={onLink} className={cn('rounded-full px-2.5 py-1 text-footnote font-semibold transition-colors hover:text-primary', TONE[item.verdict])}>
                    {item.name}
                  </a>
                ))}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
