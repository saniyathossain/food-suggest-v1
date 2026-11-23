// "How 100 g fits a day": a tick gauge for energy, a radar of what it brings (protein, fibre, iron, calcium, potassium) and bars for
// what to watch (sugar, saturated fat, sodium) against a daily limit with the overshoot hatched, and one plain sentence about it
// (worked out from the numbers, never invented). Shares of a typical adult's day (lib/reference.ts): general guidance, not advice.
import { LimitBars, Orb, Radar, TickGauge, type Axis, type LimitRow } from '@/components/charts';
import { useI18n } from '@/lib/i18n';
import { DAILY_KCAL, GET, share, WATCH } from '@/lib/reference';
import type { Nutrients } from '@/lib/types';

const MIN_AXES = 3;
const GOOD_SHARE = 0.15;
const HIGH_SHARE = 0.25;
/** The radar's outer ring is half a day: 100 g of one food rarely covers more, and a full-day ring would leave the shape a dot. */
const RADAR_FULL = 0.5;

export function Balance({ nutrients }: { nutrients: Nutrients }) {
  const { t, num } = useI18n();
  const percent = (value: number) => `${num(Math.round(value * 100))}%`;
  const name = (id: string) => (t.food as unknown as Record<string, string>)[id] ?? id;
  const brings = GET.flatMap(({ key, id, daily }) => {
    const value = share(nutrients, key, daily);
    return value === null ? [] : [{ id, value }];
  });
  const watch = WATCH.flatMap(({ key, id, limit }) => {
    const value = share(nutrients, key, limit);
    return value === null ? [] : [{ id, value }];
  });
  const energy = nutrients.kcal === null ? null : nutrients.kcal / DAILY_KCAL;
  if (brings.length < MIN_AXES && watch.length === 0 && energy === null) return null;

  const axes: Axis[] = brings.map(({ id, value }) => ({ key: id, label: name(id), value: value / RADAR_FULL }));
  const rows: LimitRow[] = watch.map(({ id, value }) => ({ key: id, label: name(id), value, display: `${percent(value)} ${t.food.ofLimit}`, over: t.food.overLimit }));
  const best = [...brings].sort((first, second) => second.value - first.value)[0];
  const high = [...watch].sort((first, second) => second.value - first.value)[0];
  const parts = [
    best && best.value >= GOOD_SHARE ? t.food.insightGood.replace('{0}', name(best.id).toLowerCase()).replace('{1}', percent(best.value)) : null,
    high && high.value >= HIGH_SHARE ? t.food.insightWatch.replace('{0}', name(high.id).toLowerCase()).replace('{1}', percent(high.value)) : null,
  ].filter((part): part is string => part !== null);

  return (
    <section aria-labelledby="balance-title" className="grid gap-5 border-t pt-6">
      <div className="grid gap-1">
        <h3 id="balance-title" className="text-headline">{t.food.balance}</h3>
        <p className="text-subhead text-muted-foreground">{t.food.balanceLead}</p>
      </div>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)]">
        {energy !== null && (
          <div className="mx-auto grid justify-items-center gap-1">
            <TickGauge value={energy} color="var(--saffron)" label={t.food.energyShare}>
              <span className="numeral text-title-1 font-bold leading-none">{percent(energy)}</span>
              <span className="mt-1 max-w-[7rem] text-balance text-caption leading-tight text-muted-foreground">{t.food.energyShare}</span>
            </TickGauge>
          </div>
        )}
        {brings.length >= MIN_AXES && (
          <figure className="grid gap-1.5">
            <Radar axes={axes} color="var(--river)" ariaLabel={`${t.food.brings}: ${brings.map((item) => `${name(item.id)} ${percent(item.value)}`).join(', ')}`} />
            <figcaption className="text-center text-caption text-muted-foreground">{t.food.radarScale}</figcaption>
          </figure>
        )}
        {rows.length > 0 && (
          <div className="grid gap-3">
            <h4 className="text-subhead font-semibold">{t.food.watch}</h4>
            <LimitBars rows={rows} limitLabel={t.food.limitNote} />
          </div>
        )}
      </div>
      {parts.length > 0 && (
        <p className="surface-soft flex items-center gap-3 rounded-2xl p-4 text-subhead">
          <Orb />
          <span>{parts.join(' ')}</span>
        </p>
      )}
      <p className="text-caption text-muted-foreground">{t.food.referenceNote}</p>
    </section>
  );
}
