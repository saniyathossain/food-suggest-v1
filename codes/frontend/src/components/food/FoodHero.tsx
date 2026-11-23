// A food's head: its pictures (components/food/Gallery: the cut-out first, a strip when there are more, following the chosen
// way of cooking), group, name, the season pill (months in the reader's language, with "In season now"
// when it is), the imported badge, and a chip per condition with its verdict.
import { CalendarDays, CategoryIcon } from '@/components/icons';
import { Gallery } from '@/components/food/Gallery';
import { Badge } from '@/components/ui/badge';
import { VerdictBadge } from '@/components/Verdict';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import { seasonText, yearRound } from '@/lib/season';
import type { FoodDetail } from '@/lib/types';
import { tone } from '@/lib/utils';

function SeasonPill({ data }: { data: FoodDetail }) {
  const { t } = useI18n();
  if (data.season.length === 0) return null;
  const months = yearRound(data.season) ? t.food.yearRound : seasonText(data.season, t.season.months);
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--mango)_16%,var(--card))] py-1.5 pl-3 pr-1.5 text-subhead font-semibold">
      <CalendarDays size={17} className="text-mango" />
      <span>
        {t.food.season}: {months}
      </span>
      {data.in_season && <Badge variant="season">{t.food.inSeason}</Badge>}
    </span>
  );
}

export function FoodHero({ data, variant }: { data: FoodDetail; variant: string }) {
  const { t, num } = useI18n();
  return (
    <header className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:items-center md:gap-10">
      <Gallery photos={data.photos} name={data.name} category={data.category.slug} variant={variant} />
      <div className="grid content-center gap-4">
        <p className="flex flex-wrap items-center gap-2 text-subhead font-semibold text-muted-foreground">
          <CategoryIcon slug={data.category.slug} size={18} /> {data.category.name}
          {data.subcategory && <span className="text-faint-foreground">· {data.subcategory.name}</span>}
          {data.origin === 'imported' && <Badge variant="idle">{t.food.imported}</Badge>}
        </p>
        <h1 className="text-display">{data.name}</h1>
        <div className="flex flex-wrap gap-2">
          <SeasonPill data={data} />
          {data.age_from_months !== null && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--tone-rose)_14%,var(--card))] px-3.5 py-1.5 text-subhead font-semibold">
              {data.age_from_months === 0 ? t.baby.fromBirth : t.baby.fromMonths.replace('{n}', num(data.age_from_months))}
            </span>
          )}
        </div>
        <ul className="flex flex-wrap gap-2">
          {data.verdicts.length === 0 && <li className="text-subhead text-muted-foreground">{t.foods.neutral}</li>}
          {data.verdicts.map((entry) => (
            <li key={entry.condition.slug}>
              <a href={`/condition/${entry.condition.slug}`} onClick={onLink} className="chip press" style={tone(entry.condition.color)}>
                <i className="dot ml-1" /> {entry.condition.name} <VerdictBadge verdict={entry.verdict} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
