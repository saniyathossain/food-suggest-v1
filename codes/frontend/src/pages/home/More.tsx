// The rest of Today, in its own chunk (after first paint): in season now (mango shelf), conditions (feature + shelf), food of the day
// (saffron feature split), eat more of these (chip row), swaps that help (river band), today's tip (aubergine card).
import { Season } from './Season';
import { Conditions } from './Conditions';
import { FoodOfDay } from './FoodOfDay';
import { Swaps } from './Swaps';
import { Tip } from './Tip';
import { ShelfBones, TitleBone } from '@/components/kit/bones';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap, FoodSearch } from '@/lib/types';

export default function HomeMore({ boot }: { boot: Bootstrap }) {
  const { lang } = useI18n();
  const { data: foods } = useResource<FoodSearch[]>(endpoints.foods(lang, '', ''));
  return (
    <>
      <Season boot={boot} />
      <Conditions boot={boot} />
      {!foods && (
        <div>
          <TitleBone />
          <ShelfBones count={3} />
        </div>
      )}
      {foods && <FoodOfDay boot={boot} foods={foods} />}
      {foods && <Swaps foods={foods} />}
      <Tip />
    </>
  );
}
