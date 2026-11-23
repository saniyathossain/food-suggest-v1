// Today as FlavorFit's dashboard: a bento of white cards on the grey page.
//   · the greeting and today's schedule (the week as date pills, today in yellow; the day's meals, past ones ticked, the next marked)
//   · Report: four pastel tiles — water (a wave that rises per glass), the next meal (a gauge filling toward it), in season (a line of
//     foods in season month by month, this month dotted) and the glycemic index of today's food (a gauge in its band's colour)
//   · the next meal as the tall photo card (the page's largest image, preloaded by the server), with its italic title
//   · eat more of these as a ticked list with the yellow button, good foods by group as bars, and the violet promo card.
// Every number is real: the catalogue, the clock and this device's water log. Nothing here is invented.
import { Gauge } from '@/components/charts/Gauge';
import { CategoryIcon, Utensils } from '@/components/icons';
import { ArrowRight, Check, GlassWater, Leaf, Pill, Plus } from '@/components/icons/page';
import { FirstRun } from '@/components/journey/FirstRun';
import { Cutout } from '@/components/kit/cutout';
import { GlowBars, GlowCard, type Glow } from '@/components/kit/glow';
import { Photo } from '@/components/kit/photo';
import { FoodThumb } from '@/components/FoodRow';
import { useNextSlot } from '@/components/NextMeal';
import { endpoints, useResource } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clock, digits, useI18n } from '@/lib/i18n';
import { pickForToday } from '@/lib/plan';
import { setPrefs, usePrefs } from '@/lib/prefs';
import { onLink } from '@/lib/router';
import type { Bootstrap, FoodSearch, PersonalPlan } from '@/lib/types';
import { cn } from '@/lib/utils';

const HERO_SIZES = '(max-width: 640px) 270px, (max-width: 1024px) calc(100vw - 64px), 600px';
const GOAL = 8;
const minutesOf = (time: string) => {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
};

/** A white bento card with the reference's small outlined icon and title. */
export function Card({ icon: Glyph, title, lead, action, className, children, id }: { icon: typeof Leaf; title: string; lead?: string | undefined; action?: React.ReactNode; className?: string | undefined; children: React.ReactNode; id?: string | undefined }) {
  return (
    <section aria-labelledby={id} className={cn('surface grid content-start gap-5 rounded-[30px] p-5 sm:p-7', className)}>
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-card text-foreground" aria-hidden>
          <Glyph size={17} />
        </span>
        <h2 id={id} className="text-callout font-bold not-italic [font-family:var(--font-sans)]">
          {title}
          {lead && <span className="ml-1.5 text-footnote font-medium text-muted-foreground">{lead}</span>}
        </h2>
        {action && <span className="ml-auto">{action}</span>}
      </header>
      {children}
    </section>
  );
}

function Greeting() {
  const { t } = useI18n();
  const { me } = useAuth();
  const first = me?.name.trim().split(/\s+/)[0];
  return (
    <div className="grid gap-1">
      <h1 className="text-[clamp(34px,4vw,48px)] leading-[1.02]">{first ? t.dash.helloName.replace('{name}', first) : t.dash.hello}</h1>
      <p className="text-callout text-muted-foreground">{t.dash.lead}</p>
    </div>
  );
}

type Slot = { slug: string; name: string; time: string };

function Schedule({ boot, meals }: { boot: Bootstrap; meals?: Slot[] | undefined }) {
  const { t, lang } = useI18n();
  const general = useNextSlot(boot);
  const current = general.current;
  const slots: Slot[] = meals && meals.length > 0 ? meals : general.slots;
  const next = slots.find((slot) => minutesOf(slot.time) >= current) ?? slots[0];
  const today = new Date();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  const days = Array.from({ length: 5 }, (_, offset) => {
    const day = new Date(today);
    day.setDate(today.getDate() + offset - 2);
    return day;
  });
  return (
    <Card icon={Utensils} id="schedule-title" title={t.dash.schedule}>
      <ol className="grid grid-cols-5 gap-1.5" aria-label={today.toLocaleDateString(locale, { month: 'long' })}>
        {days.map((day) => {
          const isToday = day.toDateString() === today.toDateString();
          return (
            <li key={day.toISOString()} aria-current={isToday ? 'date' : undefined} className={cn('grid justify-items-center gap-0.5 rounded-full py-2.5', isToday ? 'bg-cta text-cta-ink shadow-[var(--lift-sun-sm)]' : 'bg-muted text-muted-foreground')}>
              <span className="text-callout font-extrabold leading-none">{digits(String(day.getDate()), lang)}</span>
              <span className="text-[11px]">{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
            </li>
          );
        })}
      </ol>
      <ul className="grid">
        {slots.map((slot) => {
          const past = minutesOf(slot.time) < current && slot !== next;
          const isNext = slot === next;
          return (
            <li key={slot.slug} className="grid grid-cols-[22px_1fr_auto] items-center gap-3 border-b py-2.5 last:border-0">
              <span className={cn('grid size-[22px] place-items-center rounded-full border-2', past ? 'border-foreground bg-ink text-ink-foreground' : 'border-border')}>
                {past && <Check size={12} strokeWidth={2.6} />}
              </span>
              <span className="grid min-w-0 leading-tight">
                <span className="text-caption text-muted-foreground">{clock(slot.time, lang)}</span>
                <strong className={cn('truncate text-subhead', past && 'text-muted-foreground line-through decoration-1')}>{slot.name}</strong>
              </span>
              {isNext ? <span className="rounded-full bg-cta px-2.5 py-0.5 text-caption font-bold text-cta-ink">{t.dash.next}</span> : past ? <span className="text-caption text-muted-foreground">{t.dash.done}</span> : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function WaterTile() {
  const { t, num } = useI18n();
  const { water } = usePrefs();
  const today = new Date().toDateString();
  const count = water.day === today ? water.glasses : 0;
  return (
    <button type="button" onClick={() => setPrefs({ water: { day: today, glasses: Math.min(GOAL, count + 1) } })} title={t.dash.addGlass} className="pastel press relative isolate grid min-h-40 cursor-pointer content-between overflow-hidden p-4 text-left [--tile:var(--tint-sky)] [--tone:var(--ok)]">
      <span className="water-fill absolute inset-x-0 bottom-0 -z-10" style={{ height: `${Math.max(6, Math.round((count / GOAL) * 100))}%` }} aria-hidden>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="water-wave absolute -top-[14px] left-0 h-4 w-[200%]">
          <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 T 350 10 T 400 10 V 20 H 0 Z" fill="currentColor" />
        </svg>
      </span>
      <span className="flex items-center justify-between text-subhead font-semibold">
        {t.dash.water} <Plus size={16} /><span className="sr-only">{t.dash.addGlass}</span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <strong className="text-[28px] font-extrabold leading-none tabular-nums">{num(count)}<small className="text-subhead font-semibold"> {t.widget.glasses}</small></strong>
        <span className="text-caption font-semibold opacity-75">{t.dash.goal.replace('{n}', num(GOAL))}</span>
      </span>
    </button>
  );
}

function NextTile({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const { slots, next, current } = useNextSlot(boot);
  if (!next) return null;
  const previous = slots[slots.indexOf(next) - 1];
  const target = minutesOf(next.time) + (minutesOf(next.time) < current ? 1440 : 0);
  const start = previous ? minutesOf(previous.time) : target - 180;
  const left = target - current;
  const share = Math.max(0.03, Math.min(1, (current - start) / Math.max(1, target - start)));
  const eta = left <= 5 ? t.widget.now : left >= 60 ? `${Math.floor(left / 60)}${t.common.h} ${left % 60}${t.common.min}` : `${left}${t.common.min}`;
  return (
    <div className="pastel grid min-h-40 content-between p-4 [--tile:var(--tint-butter)]">
      <span className="text-subhead font-semibold">{t.dash.nextMeal}</span>
      <Gauge value={share} color="var(--tone-sun)" label={`${t.dash.nextMeal}: ${next.name}, ${digits(eta, lang)}`} className="mx-auto -mb-1 w-[78%]" />
      <span className="flex items-end justify-between gap-2">
        <strong className="text-[22px] font-extrabold leading-none tabular-nums">{digits(eta, lang)}</strong>
        <span className="truncate text-caption font-semibold opacity-75">{next.name}</span>
      </span>
    </div>
  );
}

function SeasonTile({ foods }: { foods: FoodSearch[] | undefined }) {
  const { t, num, lang } = useI18n();
  const month = new Date().getMonth() + 1;
  const counts = Array.from({ length: 12 }, (_, index) => foods?.filter((food) => food.season.includes(index + 1)).length ?? 0);
  const max = Math.max(1, ...counts);
  const points = counts.map((value, index) => [4 + (index / 11) * 92, 44 - (value / max) * 36] as const);
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const here = points[month - 1]!;
  const monthName = (index: number) => new Date(2026, index, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { month: 'short' });
  return (
    <div className="pastel grid min-h-40 content-between p-4 [--tile:var(--tint-mint)]">
      <span className="text-subhead font-semibold">{t.dash.inSeason}</span>
      <svg viewBox="0 0 100 48" className="h-14 w-full overflow-visible" role="img" aria-label={`${t.dash.perMonth}: ${counts.map((value, index) => `${monthName(index)} ${num(value)}`).join(', ')}`}>
        <path d={path} fill="none" stroke="var(--recommended)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r="6" fill="transparent">
            <title>{`${monthName(index)}: ${num(counts[index] ?? 0)}`}</title>
          </circle>
        ))}
        <circle cx={here[0]} cy={here[1]} r="3.2" fill="var(--recommended)" stroke="var(--tint-mint)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="flex items-end justify-between gap-2">
        <strong className="text-[28px] font-extrabold leading-none tabular-nums">{foods ? num(counts[month - 1] ?? 0) : '—'}</strong>
        <span className="text-caption font-semibold opacity-75">{t.dash.inSeasonLead}</span>
      </span>
    </div>
  );
}

function GiTile({ foods }: { foods: FoodSearch[] | undefined }) {
  const { t, num } = useI18n();
  const measured = foods?.filter((food) => food.gi !== null && food.gi < 70 && food.verdicts.some((entry) => entry.verdict === 'recommended') && !food.verdicts.some((entry) => entry.verdict === 'avoid')) ?? [];
  const food = pickForToday(measured, 3);
  const gi = food?.gi ?? null;
  const band = gi === null ? null : gi <= 55 ? 'low' : gi < 70 ? 'medium' : 'high';
  const color = band === 'low' ? 'var(--recommended)' : band === 'medium' ? 'var(--limit)' : 'var(--avoid)';
  return (
    <a href={food ? `/food/${food.slug}` : '/foods'} onClick={onLink} className="pastel press grid min-h-40 content-between p-4 [--tile:var(--tint-blush)]">
      <span className="text-subhead font-semibold">{t.dash.gi}</span>
      <Gauge value={(gi ?? 0) / 100} color={color} label={food && gi !== null ? `${t.dash.giOf.replace('{food}', food.name)}: ${gi}` : t.dash.gi} className="mx-auto -mb-1 w-[78%]" />
      <span className="flex items-end justify-between gap-2">
        <strong className="text-[28px] font-extrabold leading-none tabular-nums">
          {gi === null ? '—' : num(gi)}
          {band && <small className="ml-1 text-caption font-bold">{t.glycemic.band[band]}</small>}
        </strong>
        <span className="truncate text-caption font-semibold opacity-75">{food?.name}</span>
      </span>
    </a>
  );
}

function NextMealCard({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const { next } = useNextSlot(boot);
  if (!next) return null;
  return (
    <a href="/plan" onClick={onLink} className="surface group grid content-start gap-5 rounded-[30px] p-3 sm:p-4">
      <div className="relative overflow-hidden rounded-[22px] bg-[var(--tint-butter)]">
        {next.cutout ? (
          <Cutout src={next.cutout} alt={next.name} eager ratio="4 / 3" sizes={HERO_SIZES} className="mx-auto w-[86%]" />
        ) : (
          <Photo src={next.image} alt={next.name} eager ratio="4 / 3" sizes={HERO_SIZES} tone="#e8a33d" className="w-full" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-caption font-bold backdrop-blur-md">
          {t.dash.nextMeal} · {clock(next.time, lang)}
        </span>
      </div>
      <div className="grid gap-3 px-2 pb-2">
        <h2 className="text-[clamp(26px,2.4vw,32px)] leading-[1.05]">{next.name}</h2>
        <p className="text-footnote text-muted-foreground">{t.home.lead}</p>
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-4 py-2 text-subhead font-semibold transition-colors group-hover:bg-muted">
          {t.dash.openRecipe} <ArrowRight size={16} />
        </span>
      </div>
    </a>
  );
}

type Item = { slug: string; name: string; image: string | null; cutout: string | null; category: string };

function EatMoreList({ boot, foods, mine }: { boot: Bootstrap; foods: FoodSearch[] | undefined; mine?: Item[] | undefined }) {
  const { t } = useI18n();
  const names = new Map(boot.categories.map((item) => [item.slug, item.name]));
  const good: Item[] = mine ?? (foods ?? []).filter((food) => food.verdicts.some((entry) => entry.verdict === 'recommended') && !food.verdicts.some((entry) => entry.verdict === 'avoid'));
  const shown = [0, 1, 2, 3, 4, 5].map((salt) => pickForToday(good, salt * 7)).filter((food, index, all): food is Item => Boolean(food) && all.indexOf(food) === index);
  return (
    <Card icon={Check} id="eatmore-title" title={t.home.eatMore}>
      <ul className="grid">
        {shown.map((food) => (
          <li key={food.slug}>
            <a href={`/food/${food.slug}`} onClick={onLink} className="flex items-center gap-3 rounded-xl py-1.5 transition-colors hover:bg-muted">
              <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-recommended text-white" aria-hidden>
                <Check size={13} strokeWidth={2.6} />
              </span>
              <FoodThumb image={food.image} cutout={food.cutout} name={food.name} category={food.category} size="size-9" />
              <span className="min-w-0 flex-1 truncate text-subhead font-semibold">{food.name}</span>
              <span className="truncate text-caption text-muted-foreground">{names.get(food.category)}</span>
            </a>
          </li>
        ))}
        {!foods && !mine && [0, 1, 2, 3, 4].map((index) => <li key={index} className="shimmer my-1.5 h-9 rounded-xl" />)}
      </ul>
      <a href="/foods" onClick={onLink} className="press inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-subhead font-bold text-cta-ink shadow-[var(--lift-sun-sm)] transition-colors hover:bg-cta-hover">
        <Leaf size={17} /> {t.dash.seeFoods}
      </a>
    </Card>
  );
}

function Groups({ boot, foods, mine }: { boot: Bootstrap; foods: FoodSearch[] | undefined; mine?: Item[] | undefined }) {
  const { t, num } = useI18n();
  const good: { category: string }[] = mine ?? (foods ?? []).filter((food) => food.verdicts.some((entry) => entry.verdict === 'recommended') && !food.verdicts.some((entry) => entry.verdict === 'avoid'));
  const rows = boot.categories
    .map((category) => ({ slug: category.slug, name: category.name, value: good.filter((food) => food.category === category.slug).length }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 7);
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Card icon={Leaf} id="groups-title" title={t.dash.groups}>
      <p className="-mt-2 text-caption text-muted-foreground">{mine ? t.dash.groupsMine : t.dash.groupsLead}</p>
      <ul className="grid h-44 grid-flow-col auto-cols-fr items-end gap-2" aria-label={t.dash.groups}>
        {rows.map((row, index) => (
          <li key={row.slug} className="grid h-full grid-rows-[1fr_auto] justify-items-center gap-1.5" title={`${row.name}: ${num(row.value)}`}>
            <span className="relative flex h-full w-full max-w-11 items-end">
              <span className="w-full rounded-t-[10px] rounded-b-[4px] transition-[height] duration-700 ease-[var(--ease-out)]" style={{ height: `${Math.max(8, (row.value / max) * 100)}%`, background: index === 0 ? 'var(--violet)' : 'color-mix(in srgb, var(--violet) 22%, var(--muted))' }} />
              {index === 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-caption font-bold tabular-nums">{num(row.value)}</span>}
            </span>
            <span className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden>
              <CategoryIcon slug={row.slug} size={15} />
            </span>
            <span className="sr-only">{`${row.name}: ${num(row.value)}`}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function YourPlan({ plan }: { plan: PersonalPlan }) {
  const { t, num } = useI18n();
  const foods = plan.plan.foods;
  const alerts = (plan.medication?.drugs.length ?? 0) + (plan.medication?.foods.length ?? 0);
  const counts = [
    { label: t.verdict.recommended, value: foods.recommended.length, tile: 'var(--tint-mint)' },
    { label: t.verdict.limit, value: foods.limit.length, tile: 'var(--tint-butter)' },
    { label: t.verdict.avoid, value: foods.avoid.length, tile: 'var(--tint-blush)' },
  ];
  return (
    <section className="promo relative grid content-between gap-6 overflow-hidden p-7">
      <div className="grid gap-3">
        <h2 className="text-[26px] leading-[1.05] text-white">{t.dash.yourPlan}</h2>
        <ul className="flex flex-wrap gap-1.5">
          {plan.plan.profile.conditions.map((condition) => (
            <li key={condition.slug} className="rounded-full bg-white/18 px-3 py-1 text-caption font-semibold text-white">{condition.name}</li>
          ))}
          {plan.plan.profile.conditions.length === 0 && <li className="text-footnote text-white/85">{t.plan.noConditions}</li>}
        </ul>
        <dl className="grid grid-cols-3 gap-2">
          {counts.map((item) => (
            <div key={item.label} className="grid gap-0.5 rounded-2xl p-3 text-[var(--tint-ink)]" style={{ background: item.tile }}>
              <dd className="text-[24px] font-extrabold leading-none tabular-nums">{num(item.value)}</dd>
              <dt className="truncate text-caption font-semibold">{item.label}</dt>
            </div>
          ))}
        </dl>
        {alerts > 0 && (
          <p className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-footnote font-semibold text-white">
            <Pill size={16} /> {t.dash.alerts.replace('{n}', num(alerts))}
          </p>
        )}
      </div>
      <a href="/plan" onClick={onLink} className="press relative inline-flex h-11 w-fit items-center gap-2 rounded-full bg-cta px-5 text-subhead font-bold text-cta-ink">
        {t.dash.openPlan} <ArrowRight size={17} />
      </a>
    </section>
  );
}

function FinishProfile() {
  const { t } = useI18n();
  return (
    <section className="promo grid content-between gap-6 p-6">
      <div className="grid gap-2">
        <h2 className="text-[26px] leading-[1.05] text-white">{t.dash.finishTitle}</h2>
        <p className="text-subhead text-white/85">{t.dash.finishLead}</p>
      </div>
      <a href="/welcome" onClick={onLink} className="press inline-flex h-11 w-fit items-center gap-2 rounded-full bg-cta px-5 text-subhead font-bold text-cta-ink">
        {t.dash.finishButton} <ArrowRight size={17} />
      </a>
    </section>
  );
}

export function Promo() {
  const { t } = useI18n();
  return (
    <section className="promo relative grid content-between gap-6 overflow-hidden p-6">
      <span aria-hidden className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
      <div className="relative grid gap-2">
        <h2 className="text-[28px] leading-[1.05] text-white">{t.dash.promoTitle}</h2>
        <p className="text-subhead text-white/85">{t.dash.promoLead}</p>
      </div>
      <a href="#builder" className="press relative inline-flex h-11 w-fit items-center gap-2 rounded-full border border-white/70 px-5 text-subhead font-bold text-white transition-colors hover:bg-white/10">
        <Plus size={17} /> {t.dash.promoButton}
      </a>
    </section>
  );
}

function PlanTrio({ boot, plan }: { boot: Bootstrap; plan: PersonalPlan }) {
  const { t, num } = useI18n();
  const names = new Map(boot.categories.map((item) => [item.slug, item.name]));
  const lists: { key: 'recommended' | 'limit' | 'avoid'; glow: Glow }[] = [
    { key: 'recommended', glow: 'green' },
    { key: 'limit', glow: 'amber' },
    { key: 'avoid', glow: 'red' },
  ];
  return (
    <section aria-label={t.dash.yourPlan} className="grid gap-5 md:grid-cols-3 xl:gap-7">
      {lists.map((list) => {
        const items = plan.plan.foods[list.key];
        const groups = [...new Set(items.map((item) => item.category))];
        const counts = groups.map((group) => items.filter((item) => item.category === group).length);
        const top = groups[counts.indexOf(Math.max(0, ...counts))];
        return (
          <a key={list.key} href="/plan" onClick={onLink} className="press block">
            <GlowCard
              glow={list.glow}
              label={t.dash.trioLabel.replace('{n}', num(items.length))}
              statement={items.length > 0 ? items.slice(0, 3).map((item) => item.name).join(', ') : t.overview.none}
              word={t.verdict[list.key]}
              chart={items.length > 0 && <GlowBars values={counts} labels={groups.map((group) => names.get(group) ?? group)} title={t.dash.groupsMine} markLabel={names.get(top ?? '') ?? ''} />}
              className="min-h-[22rem]"
            />
          </a>
        );
      })}
    </section>
  );
}

export function Dashboard({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const { data: foods } = useResource<FoodSearch[]>(endpoints.foods(lang, '', ''));
  // signed in: the person's own plan drives the schedule, the lists and the plan card
  const { data: plan, error: planError } = useResource<PersonalPlan>(`/api/v1/me/plan?lang=${lang}`);
  const ownSlots = (plan?.plan.mode?.slots ?? []).filter((slot) => slot.time !== null).map((slot) => ({ slug: slot.name, name: slot.name, time: slot.time ?? '' }));
  const meals = plan ? (ownSlots.length > 0 ? ownSlots : plan.plan.meals.map((meal) => ({ slug: meal.slug, name: meal.name, time: meal.time }))) : undefined;
  const mine = plan?.plan.foods.recommended;
  return (
    <div className="grid gap-6 xl:gap-8">
      <Greeting />
      <FirstRun plan={plan} noProfile={Boolean(planError)} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-5">
        <div className="grid content-start gap-4 max-md:order-3 xl:gap-5">
          <Schedule boot={boot} meals={meals} />
        </div>
        <div className="grid content-start gap-4 max-md:order-1 xl:gap-5">
          <NextMealCard boot={boot} />
        </div>
        <div className="grid content-start gap-4 max-md:order-2 md:col-span-2 xl:col-span-1 xl:gap-5">
          <Card icon={GlassWater} id="report-title" title={t.dash.report} lead={t.dash.reportLead}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <WaterTile />
              <NextTile boot={boot} />
              <SeasonTile foods={foods} />
              <GiTile foods={foods} />
            </div>
          </Card>
        </div>
      </div>
      {plan && <PlanTrio boot={boot} plan={plan} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)] xl:gap-5">
        <EatMoreList boot={boot} foods={foods} mine={mine} />
        <Groups boot={boot} foods={foods} mine={mine} />
        {plan ? <YourPlan plan={plan} /> : planError ? <FinishProfile /> : <span className="shimmer block min-h-64 rounded-[28px]" />}
      </div>
    </div>
  );
}

export default Dashboard;
