// One condition: a big cover (its photo, its tile and name over it), sticky segmented tabs (foods · when to eat · habits) that stay
// under the top bar while the page scrolls, verdict lanes as colour-coded columns (swipeable on a phone), then sources.
import { useState } from 'react';
import { Icon, Utensils } from '@/components/icons';
import { Clock, HeartHandshake } from '@/components/icons/page';
import { Crumbs } from '@/components/journey/Crumbs';
import { PlanNext } from '@/components/journey/NextStep';
import { FoodRow } from '@/components/FoodRow';
import { Insight } from '@/components/Insight';
import { Lane, Lanes } from '@/components/Lanes';
import { ConditionBones } from '@/components/kit/routeskeleton';
import { ErrorBox } from '@/components/kit/loaderror';
import { Photo } from '@/components/kit/photo';
import { FadeIn, MotionRoot } from '@/components/motion';
import { Disclaimer, Sources } from '@/components/Sources';
import { HabitGrid, TimingList } from '@/components/Timing';
import { Segmented } from '@/components/ui/segmented';
import { VERDICTS } from '@/components/Verdict';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ConditionDetail } from '@/lib/types';
import { tone } from '@/lib/utils';

type Tab = 'foods' | 'timing' | 'habits';

function Cover({ data }: { data: ConditionDetail }) {
  return (
    <header className="relative isolate overflow-hidden rounded-2xl" style={tone(data.color)}>
      <Photo src={data.image} tone={data.color} eager ratio="21 / 9" sizes="(max-width: 1440px) 100vw, 1380px" className="min-h-[300px]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgb(8_14_10/0.82))]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-5 text-white sm:p-8">
        <span className="tile size-16 rounded-xl sm:size-20">
          <Icon name={data.icon} size={36} />
        </span>
        <div className="min-w-0 flex-1 basis-[280px]">
          <h1 className="text-large-title [text-shadow:0_2px_18px_rgb(0_0_0/0.35)]">{data.name}</h1>
          <p className="mt-2 max-w-[65ch] text-callout text-white/90">{data.summary}</p>
        </div>
      </div>
    </header>
  );
}

function Body({ data }: { data: ConditionDetail }) {
  const { t, num } = useI18n();
  const [tab, setTab] = useState<Tab>('foods');
  return (
    <div className="grid gap-8">
      <Cover data={data} />
      <div className="sticky top-[78px] z-20 -my-2 py-2">
        <Segmented<Tab>
          size="lg"
          label={data.name}
          value={tab}
          onChange={setTab}
          className="seg-solid"
          options={[
            { value: 'foods', label: <><Utensils size={18} /> {t.condition.foods}</> },
            { value: 'timing', label: <><Clock size={18} /> {t.condition.timing} · {num(data.timing.length)}</> },
            { value: 'habits', label: <><HeartHandshake size={18} /> {t.condition.habits} · {num(data.habits.length)}</> },
          ]}
        />
      </div>
      <FadeIn id={tab}>
        {tab === 'foods' && (
          <div className="grid gap-5">
            <Insight>
              {t.insight.condition
                .replace('{0}', data.name)
                .replace('{1}', num(data.foods.avoid.length))
                .replace('{2}', num(data.foods.limit.length))
                .replace('{3}', num(data.foods.recommended.length))
                .replace('{4}', data.foods.recommended.slice(0, 3).map((food) => food.name).join(', '))}
            </Insight>
          <Lanes>
            {VERDICTS.map((verdict) => (
              <Lane key={verdict} verdict={verdict} count={data.foods[verdict].length}>
                {data.foods[verdict].length === 0 && <li className="py-3 text-subhead text-muted-foreground">—</li>}
                {data.foods[verdict].map((food) => (
                  <FoodRow key={food.slug} slug={food.slug} name={food.name} image={food.image} cutout={food.cutout} category={food.category}>
                    <small className="text-footnote text-muted-foreground">{food.reason}</small>
                  </FoodRow>
                ))}
              </Lane>
            ))}
          </Lanes>
          </div>
        )}
        {tab === 'timing' && <TimingList items={data.timing} />}
        {tab === 'habits' && <HabitGrid items={data.habits} />}
      </FadeIn>
      <Sources items={data.sources} />
      <PlanNext kind="condition" />
      <Disclaimer />
    </div>
  );
}

export default function Condition({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const { data, error } = useResource<ConditionDetail>(endpoints.condition(slug, lang));
  return (
    <MotionRoot>
      <main className="page">
        <Crumbs trail={[{ href: '/', label: t.nav.conditions }]} here={data?.name} />
        {error && <ErrorBox />}
        {!data && !error && <ConditionBones />}
        {data && <Body data={data} />}
      </main>
    </MotionRoot>
  );
}
