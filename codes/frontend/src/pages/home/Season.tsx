// In season now: a shelf of what the markets have this month (GET /foods?season=now, Dhaka time), on a mango-toned band.
import { Leaf } from '@/components/icons/page';
import { FoodCard } from '@/components/FoodCard';
import { ShelfBones } from '@/components/kit/bones';
import { Carousel } from '@/components/kit/carousel';
import { SectionTitle } from '@/components/kit/section';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap, FoodSearch } from '@/lib/types';

export function Season({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const { data, error } = useResource<FoodSearch[]>(endpoints.foods(lang, '', '', true));
  if (error || (data && data.length === 0)) return null;
  const names = new Map(boot.categories.map((item) => [item.slug, item.name]));
  return (
    <section aria-labelledby="season-title" className="py-4">
      <SectionTitle icon={Leaf} id="season-title" title={t.home.seasonTitle} lead={t.home.seasonLead} accent="mango" />
      {!data && <ShelfBones />}
      {data && (
        <Carousel label={t.home.seasonTitle} previous={t.common.previous} next={t.common.next}>
          {data.map((food) => (
            <FoodCard key={food.slug} food={food} category={names.get(food.category)} sizes="(max-width: 640px) 78vw, 280px" className="w-[min(78vw,280px)]" />
          ))}
        </Carousel>
      )}
    </section>
  );
}
