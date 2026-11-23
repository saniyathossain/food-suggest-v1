// My account: everyone on the account (self and family, as many as the tier allows) and, for the chosen person, tabs for
// About & conditions, Medicines and History; then the plan and payments. Right after signing up it opens as the welcome steps: details first, then
// medicines, then the plan.
import { useCallback, useEffect, useState } from 'react';
import { Billing } from '@/components/account/Billing';
import { BloodPressureCard } from '@/components/account/BloodPressureCard';
import { LabsPanel } from '@/components/account/LabsPanel';
import { MedicinesPanel } from '@/components/account/MedicinesPanel';
import { PersonForm } from '@/components/account/PersonForm';
import { UpgradeCard } from '@/components/account/Upgrade';
import { WelcomeSteps } from '@/components/journey/WelcomeSteps';
import { PageBones } from '@/components/kit/routeskeleton';
import { toast } from '@/components/kit/toast';
import { ChartLine, Pill, Plus, Users } from '@/components/icons/page';
import { UserRound } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { send } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { feature, signOut, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { navigate } from '@/lib/router';
import type { Bootstrap, Person } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'about' | 'medicines' | 'history';

export default function Account({ boot, welcome = false }: { boot: Bootstrap; welcome?: boolean }) {
  const { t, lang } = useI18n();
  const { me } = useAuth();
  const prefs = usePrefs();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [chosen, setChosen] = useState<number | 'new' | null>(null);
  const wanted = new URLSearchParams(window.location.search).get('medicine') ?? '';
  const [tab, setTab] = useState<Tab>(wanted ? 'medicines' : 'about');
  const load = useCallback(async () => {
    const rows = await send<Person[]>(`/api/v1/me/profiles?lang=${lang}`, 'GET');
    setPeople(rows);
    setChosen((now) => (now === 'new' || (typeof now === 'number' && rows.some((row) => row.id === now)) ? now : rows[0]?.id ?? 'new'));
  }, [lang]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!me || !people) return <PageBones shape="plan" />;
  const person = typeof chosen === 'number' ? people.find((row) => row.id === chosen) ?? null : null;
  const cap = feature(me, 'profiles');
  const full = cap >= 0 && people.length >= cap;
  // the quick builder on Today saved a draft on this device: use it to start the first profile
  const draft = prefs.profile;
  const seed: Person | null =
    person ??
    (people.length === 0 && draft
      ? { id: 0, name: me.name, relation: 'me', birth_year: new Date().getFullYear() - draft.age, age: draft.age, gender: draft.gender, country: draft.country, pregnancy: 'none', mode: draft.mode ?? 'everyday', height_cm: null, waist_cm: null, activity: null, sleep_hours: null, budget: null, allergens: [], allergies: [], surgeries: [], conditions: boot.conditions.filter((item) => draft.conditions.includes(item.slug)).map((item) => ({ condition: { slug: item.slug, name: item.name, icon: item.icon, color: item.color }, diagnosed_year: null })), medicines: [], labs: [] }
      : null);
  const saved = async (id: number) => {
    toast(t.account.saved);
    await load();
    setChosen(id);
    if (welcome) setTab('medicines');
  };
  const remove = async () => {
    if (!person || !(await confirmDialog({ title: t.account.delete, body: t.account.confirmDelete, tone: 'danger' }))) return;
    await send(`/api/v1/me/profiles/${person.id}`, 'DELETE');
    setChosen(null);
    await load();
  };
  const tabs: { value: Tab; label: string }[] = [
    { value: 'about', label: t.account.about },
    { value: 'medicines', label: t.account.medicines },
    { value: 'history', label: t.account.history },
  ];
  return (
    <main className="page grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-large-title">{welcome ? t.account.welcome : t.account.title}</h1>
          <p className="mt-1 text-subhead text-muted-foreground">{welcome ? t.account.welcomeLead : `${me.email} · ${me.tier.name}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {people.length > 0 && <Button onClick={() => navigate('/plan')}>{t.account.finish}</Button>}
          {!welcome && (
            <Button variant="outline" onClick={() => void signOut().then(() => navigate('/'))}>
              {t.auth.signOut}
            </Button>
          )}
        </div>
      </header>
      {welcome && <WelcomeSteps step={people.length === 0 ? 0 : tab === 'medicines' ? 1 : tab === 'history' ? 2 : 0} />}
      <section className="grid gap-3">
        <h2 className="flex items-center gap-2 text-headline">
          <Users size={18} /> {t.account.family}
        </h2>
        <div className="flex flex-wrap gap-2">
          {people.map((row) => (
            <button key={row.id} type="button" aria-pressed={chosen === row.id} onClick={() => setChosen(row.id)} className="chip press gap-2 py-2 pl-2 pr-3.5">
              <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary">
                <UserRound size={15} />
              </span>
              {row.name} <span className="text-caption text-muted-foreground">{t.account.relation[row.relation]}</span>
            </button>
          ))}
          <button type="button" disabled={full} aria-pressed={chosen === 'new'} onClick={() => { setChosen('new'); setTab('about'); }} className={cn('chip press gap-1.5', full && 'opacity-50')}>
            <Plus size={15} /> {t.account.addPerson}
          </button>
        </div>
        {full && chosen === 'new' && <UpgradeCard />}
      </section>
      {(person || chosen === 'new' || people.length === 0) && (
        <section className="surface grid grid-cols-[minmax(0,1fr)] gap-6 rounded-[28px] p-5 sm:p-7">
          {person && (
            <div className="min-w-0 max-w-full">
              <Segmented label={t.account.profiles} value={tab} onChange={(value) => setTab(value as Tab)} options={tabs} />
            </div>
          )}
          {(tab === 'about' || !person) && (
            <PersonForm key={person?.id ?? 'new'} boot={boot} me={me} person={chosen === 'new' ? null : seed} onSaved={(id) => void saved(id)} />
          )}
          {person && tab === 'medicines' && (
            <>
              <h2 className="flex items-center gap-2 text-title-3 font-bold"><Pill size={20} /> {t.meds.title}</h2>
              <MedicinesPanel me={me} person={person} preset={wanted} onChanged={() => void load()} />
            </>
          )}
          {person && tab === 'history' && (
            <>
              <h2 className="flex items-center gap-2 text-title-3 font-bold"><ChartLine size={20} /> {t.labs.title}</h2>
              <BloodPressureCard me={me} person={person} onChanged={() => void load()} />
              <LabsPanel me={me} person={person} onChanged={() => void load()} />
            </>
          )}
          {person && tab === 'about' && person.relation !== 'me' && (
            <Button variant="ghost" onClick={() => void remove()} className="w-fit text-avoid-ink">
              {t.account.delete}
            </Button>
          )}
        </section>
      )}
      {!welcome && <Billing me={me} />}
    </main>
  );
}
