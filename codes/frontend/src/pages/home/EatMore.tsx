// Eat more of these: foods that at least one condition recommends and none tells you to avoid — a compact row of food chips (dense,
// after the airy feature above it).
import { ThumbsUp } from '@/components/icons/page';
import { FoodChip } from '@/components/FoodRow';
import { SectionTitle } from '@/components/kit/section';
import { useI18n } from '@/lib/i18n';
import type { FoodSearch } from '@/lib/types';

export function EatMore({ foods }: { foods: FoodSearch[] }) {
  const { t } = useI18n();
  const good = foods.filter((food) => food.verdicts.some((entry) => entry.verdict === 'recommended') && !food.verdicts.some((entry) => entry.verdict === 'avoid'));
  if (good.length === 0) return null;
  return (
    <section aria-labelledby="eat-more-title">
      <SectionTitle icon={ThumbsUp} id="eat-more-title" title={t.home.eatMore} lead={t.home.eatMoreLead} accent="leaf" />
      <ul className="flex flex-wrap gap-2">
        {good.slice(0, 18).map((food) => (
          <li key={food.slug}>
            <FoodChip slug={food.slug} name={food.name} image={food.image} cutout={food.cutout} category={food.category} />
          </li>
        ))}
      </ul>
    </section>
  );
}
