// Food of the day: one food, the same for everyone today (picked by the date), as a feature split — a big photo beside what it is and
// how it sits with each condition — on a saffron band.
import { CategoryIcon } from '@/components/icons';
import { ArrowRight, Star } from '@/components/icons/page';
import { FoodBadges } from '@/components/FoodCard';
import { Cutout } from '@/components/kit/cutout';
import { Photo } from '@/components/kit/photo';
import { SectionTitle } from '@/components/kit/section';
import { buttonVariants } from '@/components/ui/button';
import { VerdictBadge } from '@/components/Verdict';
import { useI18n } from '@/lib/i18n';
import { pickForToday } from '@/lib/plan';
import { onLink } from '@/lib/router';
import type { Bootstrap, FoodSearch } from '@/lib/types';

export function FoodOfDay({ boot, foods }: { boot: Bootstrap; foods: FoodSearch[] }) {
  const { t } = useI18n();
  // Only a food worth celebrating: pictured, recommended for at least one condition, avoided by none.
  const pictured = foods.filter(
    (food) =>
      food.image !== null &&
      food.verdicts.some((entry) => entry.verdict === 'recommended') &&
      !food.verdicts.some((entry) => entry.verdict === 'avoid'),
  );
  // a cut-out sits on the band like the hero; fall back to photos only when no worthy food has one
  const cutouts = pictured.filter((food) => food.cutout !== null);
  const food = pickForToday(cutouts.length > 0 ? cutouts : pictured);
  if (!food) return null;
  const conditions = new Map(boot.conditions.map((condition) => [condition.slug, condition.name]));
  const category = boot.categories.find((item) => item.slug === food.category)?.name;
  return (
    <section aria-labelledby="fotd-title" className="tone-ground grid overflow-hidden rounded-2xl [--tone:var(--saffron)] md:grid-cols-2">
      <a href={`/food/${food.slug}`} onClick={onLink} className="group block" aria-hidden tabIndex={-1}>
        {food.cutout ? (
          <Cutout src={food.cutout} alt="" ratio="4 / 3" sizes="(max-width: 768px) 90vw, 46vw" zoom className="h-full p-6 sm:p-10 md:aspect-auto!" />
        ) : (
          <Photo src={food.image} alt="" ratio="4 / 3" sizes="(max-width: 768px) 100vw, 50vw" zoom className="h-full md:aspect-auto!" />
        )}
      </a>
      <div className="grid content-center gap-4 p-6 sm:p-10">
        <SectionTitle icon={Star} id="fotd-title" title={t.home.foodOfDay} accent="saffron" className="mb-0" />
        <h3 className="text-large-title">{food.name}</h3>
        <p className="flex flex-wrap items-center gap-2 text-subhead text-muted-foreground">
          <CategoryIcon slug={food.category} size={17} /> {category}
          <FoodBadges inSeason={food.in_season} imported={food.origin === 'imported'} />
        </p>
        <ul className="grid gap-2">
          {[...food.verdicts].sort((left, right) => Number(right.verdict === 'recommended') - Number(left.verdict === 'recommended')).slice(0, 4).map((entry) => (
            <li key={entry.condition} className="flex items-center justify-between gap-3 border-b border-foreground/10 pb-2 text-subhead">
              <span>{conditions.get(entry.condition) ?? entry.condition}</span>
              <VerdictBadge verdict={entry.verdict} />
            </li>
          ))}
        </ul>
        <a href={`/food/${food.slug}`} onClick={onLink} className={buttonVariants({ variant: 'outline', className: 'w-fit' })}>
          {t.home.readMore} <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
