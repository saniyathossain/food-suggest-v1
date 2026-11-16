// The top of My plan, FlavorFit style: a big greeting with the person's name, this week as round date pills (today in sunny
// yellow), and the day at a glance as pastel tiles: the meals on a day track (5 am to midnight, now marked), and eat more / go
// easy / avoid each with a gauge of its share of the food rules. Numbers come from the
// plan itself; nothing is invented.
import { DayTrack, Gauge } from '@/components/charts';
import { CountUp } from '@/components/kit/countup';
import { digits, useI18n } from '@/lib/i18n';
import type { Plan } from '@/lib/types';
import { cn } from '@/lib/utils';

function week(today: Date): Date[] {
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    return day;
  });
}

export function DayHeader({ name, data }: { name: string; data: Plan }) {
  const { t, lang } = useI18n();
  const today = new Date();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  const ownSlots = (data.mode?.slots ?? []).filter((slot) => slot.time !== null).map((slot) => ({ name: slot.name, time: slot.time ?? '' }));
  const track = ownSlots.length > 0 ? ownSlots : data.meals.map((meal) => ({ name: meal.name, time: meal.time }));
  const meals = (data.mode?.slots.length ?? 0) > 0 ? (data.mode?.slots.length ?? 0) : data.meals.length;
  const total = data.foods.recommended.length + data.foods.limit.length + data.foods.avoid.length || 1;
  const lists = [
    { label: t.verdict.recommended, value: data.foods.recommended.length, tile: 'var(--tint-mint)', color: 'var(--recommended)' },
    { label: t.verdict.limit, value: data.foods.limit.length, tile: 'var(--tint-butter)', color: 'var(--limit)' },
    { label: t.verdict.avoid, value: data.foods.avoid.length, tile: 'var(--tint-blush)', color: 'var(--avoid)' },
  ];
  return (
    <section className="surface grid min-w-0 gap-6 rounded-[32px] p-4 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
      <div className="grid min-w-0 gap-4">
        <div>
          <p className="text-subhead font-semibold text-muted-foreground">{today.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="text-display leading-none">{t.dayHeader.hello.replace('{name}', name)}</p>
        </div>
        <ol className="grid max-w-md grid-cols-7 gap-1 sm:gap-2" aria-label={t.dayHeader.week}>
          {week(today).map((day) => {
            const isToday = day.toDateString() === today.toDateString();
            return (
              <li key={day.toISOString()} aria-current={isToday ? 'date' : undefined} className={cn('grid min-w-0 justify-items-center gap-0.5 rounded-full py-2.5', isToday ? 'bg-cta text-cta-ink shadow-[var(--lift-sun-sm)]' : 'bg-muted text-muted-foreground')}>
                <span className="text-callout font-extrabold leading-none sm:text-title-3">{digits(String(day.getDate()), lang)}</span>
                <span className="text-[11px] sm:text-caption">{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="pastel col-span-3 grid gap-3 p-4 sm:p-5" style={{ ['--tile' as string]: 'var(--tint-sky)' }}>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-subhead font-semibold">{t.dayHeader.meals}</dt>
            <dd className="text-[32px] font-extrabold leading-none tracking-tight tabular-nums">
              <CountUp value={meals} />
            </dd>
          </div>
          <DayTrack meals={track} label={t.dayHeader.track} />
        </div>
        {lists.map((item) => (
          <div key={item.label} className="pastel grid content-between justify-items-start gap-2 p-3 sm:p-4" style={{ ['--tile' as string]: item.tile }}>
            <dt className="text-footnote font-semibold sm:text-subhead">{item.label}</dt>
            <dd className="grid w-full justify-items-center">
              <Gauge value={item.value / total} color={item.color} label={`${item.label}: ${Math.round((item.value / total) * 100)}%`} className="w-full max-w-[110px]" />
              <span className="-mt-6 text-[26px] font-extrabold leading-none tracking-tight tabular-nums sm:-mt-7 sm:text-[30px]">
                <CountUp value={item.value} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
