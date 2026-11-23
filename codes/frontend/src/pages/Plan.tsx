// The personal day plan (signed in): built on the server from the chosen profile (self or family) and shaped by the tier.
// Shows who it is for, the way of eating with its timeline, the day's meals with other plates, the food rules (avoid · go
// easy · eat more), medicine checks, when to eat, habits, notes and sources. What the tier held back is said plainly, with
// the way to upgrade. Signed out: an invitation to sign in. No profile yet: the welcome steps.
import { useCallback, useEffect, useState } from 'react';
import { UpgradeCard } from '@/components/account/Upgrade';
import { CalendarClock, Clock, HeartHandshake, ListChecks, Pencil, Pill, Printer, Repeat, StickyNote } from '@/components/icons/page';
import { KeyRound, UserRound } from '@/components/icons';
import { ErrorBox } from '@/components/kit/loaderror';
import { PageBones } from '@/components/kit/routeskeleton';
import { SectionTitle } from '@/components/kit/section';
import { ModePanel } from '@/components/mode/ModePanel';
import { ModePicker } from '@/components/mode/ModePicker';
import { Alternatives } from '@/components/plan/Alternatives';
import { DayHeader } from '@/components/plan/DayHeader';
import { Medication } from '@/components/plan/Medication';
import { Insight } from '@/components/Insight';
import { PlanFoods, PlanMeals, ProfileBar } from '@/components/PlanParts';
import { Disclaimer, Sources } from '@/components/Sources';
import { HabitGrid, TimingList } from '@/components/Timing';
import { Button } from '@/components/ui/button';
import { ApiError, send } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { markPlanSeen } from '@/lib/firstrun';
import { useI18n } from '@/lib/i18n';
import { navigate, onLink } from '@/lib/router';
import type { Bootstrap, Person, PersonalPlan, Plan as PlanData } from '@/lib/types';

function SignInFirst() {
  const { t } = useI18n();
  return (
    <main className="page grid min-h-[60dvh] place-items-center">
      <section className="surface grid max-w-lg gap-4 rounded-3xl p-7 text-center">
        <span className="tone-soft mx-auto grid size-14 place-items-center rounded-2xl [--tone:var(--violet)]">
          <KeyRound size={26} />
        </span>
        <h1 className="text-title-1 font-bold">{t.auth.needed}</h1>
        <p className="text-subhead text-muted-foreground">{t.auth.neededLead}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate('/login?next=/plan')}>{t.auth.signIn}</Button>
          <Button variant="outline" onClick={() => navigate('/register')}>{t.auth.signUp}</Button>
        </div>
      </section>
    </main>
  );
}

function Limited({ plan }: { plan: PersonalPlan }) {
  const { t, num } = useI18n();
  const lines = [
    plan.limited.conditions.length > 0 && t.tiers.limitedConditions.replace('{list}', plan.limited.conditions.join(', ')),
    plan.limited.suggestions > 0 && t.tiers.limitedSuggestions.replace('{n}', num(plan.limited.suggestions)),
    plan.limited.mode && t.tiers.limitedMode,
    plan.limited.medicines && t.tiers.limitedMedicines,
  ].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return <UpgradeCard text={`${t.tiers.limited}: ${lines.join(' ')}`} />;
}

function Body({ boot, data, plan, name, onMode }: { boot: Bootstrap; data: PlanData; plan: PersonalPlan; name: string; onMode: (slug: string) => void }) {
  const { t, num } = useI18n();
  const hasConditions = data.profile.conditions.length > 0;
  const mode = data.mode;
  // a fasting mode has its own meals (sehri, iftar…): the everyday meal cards would contradict it
  const ownMeals = (mode?.slots.length ?? 0) > 0;
  const everyday = data.meals.map((meal) => ({ slug: meal.slug, name: meal.name, time: meal.time, moment: '', note: '' }));
  // clock-time rules belong to everyday eating; a fasting mode keeps only the "any time" ones and brings its own times
  const timed = (items: PlanData['timing']['do']) => (ownMeals ? items.filter((item) => item.time === null) : items);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-20">
      <div className="grid gap-4">
        <DayHeader name={name} data={data} />
        <ProfileBar boot={boot} data={data} />
        {hasConditions && (
          <Insight>
            {[
              t.insight.plan
                .replace('{0}', num(data.foods.avoid.length))
                .replace('{1}', num(data.foods.limit.length))
                .replace('{2}', num(data.foods.recommended.length))
                .replace('{3}', data.foods.recommended.slice(0, 3).map((food) => food.name).join(', ')),
              data.foods.recommended.concat(data.foods.limit, data.foods.avoid).some((food) => food.conflict) ? t.insight.conflict : '',
            ]
              .filter(Boolean)
              .join(' ')}
          </Insight>
        )}
      </div>
      <Limited plan={plan} />
      {mode && (
        <section className="grid gap-5">
          <SectionTitle icon={Clock} title={t.modes.title} lead={t.modes.lead} accent="aubergine" />
          <ModePicker modes={boot.modes} value={mode.slug} onChange={onMode} />
          <ModePanel mode={mode} everyday={everyday} />
        </section>
      )}
      {!ownMeals && (
        <section className="grid gap-6">
          <SectionTitle icon={CalendarClock} title={t.plan.day} accent="saffron" />
          <PlanMeals data={data} />
          {plan.alternatives.some((row) => row.options.length > 1) && (
            <div className="grid gap-3">
              <h3 className="flex items-center gap-2 text-headline">
                <Repeat size={18} /> {t.alternatives.title}
              </h3>
              <Alternatives plan={plan} />
            </div>
          )}
        </section>
      )}
      {hasConditions && (
        <section>
          <SectionTitle icon={ListChecks} title={t.plan.foods} accent="leaf" />
          <PlanFoods data={data} />
        </section>
      )}
      {plan.medication && (
        <section>
          <SectionTitle icon={Pill} title={t.meds.checks} accent="river" />
          <Medication report={plan.medication} />
        </section>
      )}
      <section>
        <SectionTitle icon={Clock} title={t.plan.when} accent="river" />
        <div className="grid gap-6 lg:grid-cols-2">
          <TimingList items={timed(data.timing.do)} showCondition />
          <TimingList items={timed(data.timing.dont)} showCondition />
        </div>
      </section>
      <section>
        <SectionTitle icon={HeartHandshake} title={t.plan.habits} accent="coral" />
        <HabitGrid items={data.habits} />
      </section>
      {data.notes.length > 0 && (
        <section className="tone-ground rounded-2xl p-6 [--tone:var(--aubergine)] sm:p-8">
          <SectionTitle icon={StickyNote} title={t.plan.notes} accent="aubergine" />
          <ul className="grid list-disc gap-2 pl-5 text-callout marker:text-aubergine">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
      <Sources items={data.sources} />
      <Disclaimer />
    </div>
  );
}

export default function Plan({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const auth = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [plan, setPlan] = useState<PersonalPlan | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await send<Person[]>(`/api/v1/me/profiles?lang=${lang}`, 'GET');
      setPeople(rows);
      const id = chosen ?? rows[0]?.id ?? null;
      if (id === null) return;
      setPlan(await send<PersonalPlan>(`/api/v1/me/plan?profile=${id}&lang=${lang}`, 'GET'));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure : new ApiError(0, String(failure)));
    }
  }, [chosen, lang]);
  useEffect(() => {
    if (auth.status === 'in') void load();
  }, [auth.status, load]);
  useEffect(() => {
    if (plan) markPlanSeen();
  }, [plan]);
  const empty = people !== null && people.length === 0;
  useEffect(() => {
    if (empty) navigate('/welcome');
  }, [empty]);
  if (auth.status === 'loading' || empty) return <PageBones shape="plan" />;
  if (auth.status === 'out') return <SignInFirst />;
  const person = people?.find((row) => row.id === (chosen ?? plan?.profile_id)) ?? people?.[0];
  const changeMode = async (slug: string) => {
    if (!person) return;
    const body = {
      name: person.name,
      relation: person.relation,
      gender: person.gender,
      pregnancy: person.pregnancy,
      mode: slug,
      allergies: person.allergies,
      surgeries: person.surgeries,
      conditions: person.conditions.map((row) => (row.diagnosed_year === null ? { slug: row.condition.slug } : { slug: row.condition.slug, diagnosed_year: row.diagnosed_year })),
      ...(person.birth_year === null ? {} : { birth_year: person.birth_year }),
    };
    await send(`/api/v1/me/profiles/${person.id}`, 'PUT', body);
    await load();
  };
  return (
    <main className="page">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="sr-only">{t.plan.title}</h1>
          {people && people.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {people.map((row) => (
                <button key={row.id} type="button" aria-pressed={row.id === person?.id} onClick={() => setChosen(row.id)} className="chip press gap-1.5">
                  <UserRound size={15} /> {row.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="no-print flex gap-2">
          <a href="/account" onClick={onLink} className="inline-flex h-11 items-center gap-2 rounded-full border px-5 text-subhead font-semibold">
            <Pencil size={17} /> {t.profile.edit}
          </a>
          <Button variant="outline" icon={Printer} onClick={() => window.print()}>
            {t.plan.print}
          </Button>
        </div>
      </div>
      {error && <ErrorBox message={error.message} />}
      {!plan && !error && <PageBones shape="plan" />}
      {plan && <Body boot={boot} data={plan.plan} plan={plan} name={(person?.name ?? auth.me?.name ?? "").split(" ")[0] ?? ""} onMode={(slug) => void changeMode(slug)} />}
    </main>
  );
}
