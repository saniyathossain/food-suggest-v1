// My meals: a day's own plan. Four meals, each with foods added by search or taken from what the plan suggests, a portion in grams,
// and the calories and nutrients adding up live against the day's reference (the meal log API; tier feature meal_log). A food the
// person's conditions say to avoid carries its red dot in the picker. Nothing here is advice: the reference is a typical adult's.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DayTotals } from '@/components/planner/DayTotals';
import { MealCard } from '@/components/planner/MealCard';
import { bring, shift, today } from '@/components/planner/portion';
import { UpgradeCard } from '@/components/account/Upgrade';
import { EmptyState } from '@/components/journey/EmptyState';
import { ErrorBox } from '@/components/kit/loaderror';
import { PageBones } from '@/components/kit/routeskeleton';
import { toast } from '@/components/kit/toast';
import { ArrowLeft, ChevronRight, ListChecks } from '@/components/icons/page';
import { endpoints, send, useResource } from '@/lib/api';
import { feature, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import type { DayLog, FoodSearch, MealTime, Person, PersonalPlan, Verdict } from '@/lib/types';
import { cn } from '@/lib/utils';

const MEALS: MealTime[] = ['breakfast', 'lunch', 'snack', 'dinner'];

function useDay(profile: number | null, date: string) {
  const { lang } = useI18n();
  const [day, setDay] = useState<DayLog | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    if (profile === null) return;
    try {
      setDay(await send<DayLog>(`/api/v1/me/profiles/${profile}/meals?date=${date}&lang=${lang}`, 'GET'));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [profile, date, lang]);
  useEffect(() => {
    void load();
  }, [load]);
  return { day, failed, load };
}

function DayBar({ date, onShift }: { date: string; onShift: (days: number) => void }) {
  const { t, lang } = useI18n();
  const label = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
  const arrow = 'press grid size-10 place-items-center rounded-full border bg-card hover:bg-accent';
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onShift(-1)} aria-label={t.planner.before} className={arrow}>
        <ArrowLeft size={18} />
      </button>
      <p className="min-w-[11rem] text-center text-subhead font-semibold" aria-live="polite">
        {date === today() ? `${t.planner.today} · ${label}` : label}
      </p>
      <button type="button" onClick={() => onShift(1)} aria-label={t.planner.after} className={arrow}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default function Planner() {
  const { t, lang } = useI18n();
  const auth = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const allowed = feature(auth.me, 'meal_log') > 0;
  useEffect(() => {
    if (auth.status === 'out') navigate('/login?next=%2Fplanner');
    if (auth.status !== 'in') return;
    void send<Person[]>(`/api/v1/me/profiles?lang=${lang}`, 'GET')
      .then((rows) => {
        setPeople(rows);
        setChosen((now) => now ?? rows[0]?.id ?? null);
      })
      .catch(() => setPeople([]));
  }, [auth.status, lang]);
  const { data: foods } = useResource<FoodSearch[]>(endpoints.foods(lang, '', ''));
  const { data: plan } = useResource<PersonalPlan>(chosen !== null ? `/api/v1/me/plan?profile=${chosen}&lang=${lang}` : null);
  const { day, failed, load } = useDay(allowed ? chosen : null, date);
  const bySlug = useMemo(() => new Map((foods ?? []).map((food) => [food.slug, food])), [foods]);
  const verdicts = useMemo(() => {
    const map = new Map<string, Verdict>();
    (['recommended', 'limit', 'avoid'] as const).forEach((key) => plan?.plan.foods[key].forEach((food) => map.set(food.slug, key)));
    return map;
  }, [plan]);
  if (auth.status !== 'in' || people === null) return <PageBones shape="plan" />;
  const add = async (meal: MealTime, food: FoodSearch, grams: number) => {
    try {
      await send(`/api/v1/me/profiles/${chosen}/meals`, 'POST', { food: food.slug, grams, meal, eaten_on: date });
      await load();
    } catch (failure) {
      toast(t.planner.failed, 'bad');
      throw failure;
    }
  };
  const remove = async (id: number) => {
    await send(`/api/v1/me/profiles/${chosen}/meals/${id}`, 'DELETE');
    await load();
  };
  const eaten = new Set(day?.entries.map((entry) => entry.food));
  const kcal = day?.meters.find((meter) => meter.key === 'kcal');
  const left = kcal ? kcal.target - kcal.amount : Number.POSITIVE_INFINITY;
  const suggest = (index: number): FoodSearch[] => {
    const pool = (plan?.plan.foods.recommended ?? [])
      .map((food) => bySlug.get(food.slug))
      .filter((food): food is FoodSearch => food !== undefined && !eaten.has(food.slug) && food.macros !== null && (bring(food, 100)?.kcal ?? 0) <= Math.max(60, left));
    const start = pool.length === 0 ? 0 : (index * 4) % pool.length;
    return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 4);
  };
  return (
    <main className="page grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-large-title">{t.planner.title}</h1>
          <p className="mt-1 max-w-[56ch] text-subhead text-muted-foreground">{t.planner.lead}</p>
        </div>
        <DayBar date={date} onShift={(days) => setDate((now) => shift(now, days))} />
      </header>
      {people.length === 0 && <EmptyState icon={ListChecks} title={t.planner.noProfile} lead={t.planner.noProfileLead} primary={{ label: t.journey.steps.about.action, href: '/welcome' }} />}
      {people.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.account.profiles}>
          {people.map((person) => (
            <button key={person.id} type="button" aria-pressed={chosen === person.id} onClick={() => setChosen(person.id)} className={cn('chip press', chosen === person.id && 'chip-on')}>
              {person.name}
            </button>
          ))}
        </div>
      )}
      {people.length > 0 && !allowed && <UpgradeCard text={t.planner.upgrade} />}
      {allowed && failed && <ErrorBox />}
      {allowed && chosen !== null && !day && !failed && <PageBones shape="plan" />}
      {allowed && day && (
        <>
          <DayTotals day={day} />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {MEALS.map((meal, index) => (
              <MealCard key={meal} meal={meal} entries={day.entries.filter((entry) => entry.meal === meal)} foods={foods ?? []} verdicts={verdicts} suggestions={suggest(index)} onAdd={add} onRemove={remove} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
