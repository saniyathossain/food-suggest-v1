// A person's medicines: search by brand or generic (two letters, as you type), or type a name that is not listed; the dose
// in the doctor's words, the times of day, and before / with / after food (prefilled from the label when known). Current
// medicines first; a stopped one stays in history with its date. The app never suggests a dose.
import { useEffect, useState } from 'react';
import { UpgradeCard } from '@/components/account/Upgrade';
import { Pill, Plus } from '@/components/icons/page';
import { DatePicker } from '@/components/kit/datepicker';
import { FilterChip } from '@/components/kit/filterchip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, send } from '@/lib/api';
import { feature } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { FoodTiming, Me, MedicineCard, MedicineDetail, MedicineHit, MedicinePage, Person } from '@/lib/types';
import { cn } from '@/lib/utils';

const TIMES = ['morning', 'noon', 'evening', 'night'] as const;
const TIMINGS: FoodTiming[] = ['empty_stomach', 'before_food', 'with_food', 'after_food', 'any'];
const today = () => new Date().toISOString().slice(0, 10);

/** A library card as the search's own kind of hit, so a suggestion is picked the same way as a search result. */
function asHit(card: MedicineCard): MedicineHit {
  return { medicine_id: null, brand: null, company: null, strength: null, form: null, generic: { slug: card.slug, name: card.name, group: card.group, food_timing: card.food_timing, how_to_take: card.how_to_take, source: null } };
}

/** Search by brand or generic (anywhere in the name), with common medicines suggested before typing and, always at the end, a row to
    add what was typed as the person's own medicine: nothing is ever "not allowed", and what is not in the library is still kept. */
function Search({ onPick, onOwn }: { onPick: (hit: MedicineHit) => void; onOwn: (name: string) => void }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState('');
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [suggested, setSuggested] = useState<MedicineHit[]>([]);
  const [searched, setSearched] = useState(false);
  const typed = text.trim();
  useEffect(() => {
    void send<MedicinePage>(`/api/v1/library/medicines?lang=${lang}&sort=conflicts&limit=8`, 'GET')
      .then((page) => setSuggested(page.items.map(asHit)))
      .catch(() => setSuggested([]));
  }, [lang]);
  useEffect(() => {
    setSearched(false);
    if (typed.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void send<MedicineHit[]>(`/api/v1/medicines/search?q=${encodeURIComponent(typed)}&lang=${lang}`, 'GET')
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearched(true));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [typed, lang]);
  const choose = (hit: MedicineHit) => {
    onPick(hit);
    setText('');
  };
  return (
    <div className="grid gap-2">
      <Label htmlFor="med-search">{t.meds.search}</Label>
      <Input id="med-search" placeholder={t.ph.medSearch} value={text} onChange={(event) => setText(event.target.value)} autoComplete="off" maxLength={80} />
      {typed.length < 2 && suggested.length > 0 && (
        <div className="grid gap-1.5" role="group" aria-label={t.meds.suggested}>
          <p className="text-footnote font-bold text-muted-foreground">{t.meds.suggested}</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((hit) => (
              <button key={hit.generic.slug} type="button" className="chip press" onClick={() => choose(hit)}>
                <Plus size={13} aria-hidden /> {hit.generic.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {typed.length >= 2 && (
        <ul role="listbox" aria-label={t.meds.search} className="grid max-h-80 overflow-y-auto overscroll-contain rounded-xl border bg-card" data-lenis-prevent>
          {hits.map((hit) => (
            <li key={`${hit.medicine_id ?? 'g'}-${hit.generic.slug}`}>
              <button type="button" onClick={() => choose(hit)} className="grid w-full gap-0.5 px-3.5 py-2.5 text-start transition-colors hover:bg-accent">
                <span className="text-subhead font-semibold">
                  {hit.brand ?? hit.generic.name} {hit.strength && <span className="font-normal text-muted-foreground">· {hit.strength}</span>}
                </span>
                <span className="text-footnote text-muted-foreground">
                  {hit.brand ? `${hit.generic.name} · ` : ''}
                  {hit.generic.group}
                  {hit.company ? ` · ${hit.company}` : ''}
                </span>
              </button>
            </li>
          ))}
          {searched && hits.length === 0 && <li className="px-3.5 py-2.5 text-footnote text-muted-foreground">{t.meds.noMatch}</li>}
          <li className="border-t">
            <button type="button" onClick={() => { onOwn(typed); setText(''); }} className="flex w-full items-center gap-2.5 px-3.5 py-3 text-start text-subhead font-semibold text-primary transition-colors hover:bg-accent">
              <Plus size={16} aria-hidden /> <span className="min-w-0 flex-1 truncate">{t.meds.addOwn.replace('{name}', typed)}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export function MedicinesPanel({ me, person, preset = '', onChanged }: { me: Me; person: Person; preset?: string; onChanged: () => void }) {
  const { t, lang } = useI18n();
  const [picked, setPicked] = useState<MedicineHit | null>(null);
  const [custom, setCustom] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [timing, setTiming] = useState<FoodTiming>('any');
  const [started, setStarted] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // arriving from a medicine's page ("Add to my medicines"): that medicine is already chosen
  useEffect(() => {
    if (!preset) return;
    void send<MedicineDetail>(`/api/v1/library/medicines/${encodeURIComponent(preset)}?lang=${lang}`, 'GET')
      .then((detail) => {
        setPicked({ medicine_id: null, brand: null, company: null, strength: null, form: null, generic: detail.generic });
        setTiming(detail.generic.food_timing);
      })
      .catch(() => undefined);
  }, [preset, lang]);
  if (feature(me, 'medicines') === 0) return <UpgradeCard text={t.tiers.limitedMedicines} />;
  const pick = (hit: MedicineHit) => {
    setPicked(hit);
    setCustom('');
    setTiming(hit.generic.food_timing);
  };
  const add = async () => {
    setBusy(true);
    setError('');
    try {
      await send(`/api/v1/me/profiles/${person.id}/medicines`, 'POST', {
        ...(picked?.medicine_id ? { medicine_id: picked.medicine_id } : picked ? { generic: picked.generic.slug } : {}),
        custom_name: picked ? '' : custom,
        dose_text: dose,
        times,
        food_timing: timing,
        ...(started ? { started_on: started } : {}),
        note: '',
      });
      setPicked(null);
      setCustom('');
      setDose('');
      setTimes([]);
      setStarted('');
      onChanged();
    } catch (failure) {
      setError(failure instanceof ApiError ? Object.values(failure.fields)[0] ?? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  const stop = async (row: number, remove: boolean) => {
    await send(`/api/v1/me/profiles/${person.id}/medicines/${row}`, 'PATCH', { stopped_on: remove ? null : today() });
    onChanged();
  };
  const current = person.medicines.filter((item) => !item.stopped_on);
  const stopped = person.medicines.filter((item) => item.stopped_on);
  return (
    <div className="grid gap-6">
      <p className="max-w-[65ch] text-subhead text-muted-foreground">{t.meds.lead}</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {current.length === 0 && <li className="text-subhead text-muted-foreground">{t.meds.empty}</li>}
        {[...current, ...stopped].map((item) => (
          <li key={item.id} className={cn('grid gap-2 rounded-2xl border bg-card p-4', item.stopped_on && 'opacity-60')}>
            <div className="flex items-start gap-3">
              <span className="tone-soft grid size-10 shrink-0 place-items-center rounded-xl [--tone:var(--river)]">
                <Pill size={18} />
              </span>
              <div className="grid min-w-0 gap-0.5">
                <strong className="text-callout">
                  {item.name} {item.strength && <span className="font-medium text-muted-foreground">· {item.strength}</span>}
                </strong>
                <span className="text-footnote text-muted-foreground">
                  {item.generic ? `${item.generic.name} · ${item.generic.group}` : ''}
                  {item.company ? ` · ${item.company}` : ''}
                </span>
              </div>
            </div>
            <p className="flex flex-wrap gap-1.5 text-caption font-semibold">
              {item.dose_text && <span className="rounded-full bg-muted px-2 py-0.5">{item.dose_text}</span>}
              {item.times.map((time) => (
                <span key={time} className="rounded-full bg-muted px-2 py-0.5">{t.meds.timeOptions[time as (typeof TIMES)[number]] ?? time}</span>
              ))}
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{t.meds.foodOptions[item.food_timing]}</span>
              {item.stopped_on && <span className="rounded-full bg-muted px-2 py-0.5">{t.meds.stoppedOn} {item.stopped_on}</span>}
            </p>
            {item.generic?.how_to_take && (
              <p className="text-footnote text-muted-foreground">
                <b className="font-semibold text-foreground">{t.meds.label}:</b> {item.generic.how_to_take}
              </p>
            )}
            {!item.stopped_on && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void stop(item.id, false)}>{t.meds.stop}</Button>
                <Button variant="ghost" size="sm" onClick={() => void stop(item.id, true)}>{t.meds.remove}</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <section className="surface grid gap-4 rounded-2xl p-5">
        <h3 className="text-headline">{t.meds.add}</h3>
        {picked || custom ? (
          <p className="flex flex-wrap items-center gap-2 rounded-xl bg-primary-soft p-3 text-subhead">
            <strong>{picked ? (picked.brand ?? picked.generic.name) : custom}</strong> {picked?.strength && `· ${picked.strength}`}
            <span className="text-muted-foreground">{picked ? picked.generic.group : t.meds.own}</span>
            <button type="button" className="ms-auto text-footnote font-semibold text-primary" onClick={() => { setPicked(null); setCustom(''); }}>{t.meds.remove}</button>
          </p>
        ) : (
          <Search onPick={pick} onOwn={(name) => { setPicked(null); setCustom(name); }} />
        )}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="med-dose">{t.meds.dose}</Label>
            <Input id="med-dose" placeholder={t.ph.dose} value={dose} onChange={(event) => setDose(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="med-start">{t.meds.started}</Label>
            <DatePicker id="med-start" label={t.meds.started} value={started} max={today()} onChange={setStarted} clearable />
          </div>
        </div>
        <p className="-mt-2 text-footnote text-muted-foreground">{t.meds.doseHint}</p>
        <fieldset className="grid gap-2">
          <legend className="mb-0.5 text-footnote font-bold text-muted-foreground">{t.meds.times}</legend>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((time) => (
              <FilterChip key={time} on={times.includes(time)} onClick={() => setTimes((now) => (now.includes(time) ? now.filter((item) => item !== time) : [...now, time]))} label={t.meds.timeOptions[time]} />
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-0.5 text-footnote font-bold text-muted-foreground">{t.meds.food}</legend>
          <div role="radiogroup" aria-label={t.meds.food} className="flex flex-wrap gap-2">
            {TIMINGS.map((value) => (
              <FilterChip key={value} on={timing === value} onClick={() => setTiming(value)} label={t.meds.foodOptions[value]} />
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-footnote text-avoid-ink">{error}</p>}
        <Button onClick={() => void add()} state={busy ? 'busy' : 'idle'} disabled={!picked && !custom.trim()} className="w-fit">
          {t.meds.add}
        </Button>
      </section>
    </div>
  );
}
