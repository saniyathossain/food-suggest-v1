// A person's details: name, who they are to you, year of birth, gender, pregnancy, conditions (with the year diagnosed),
// allergies, past surgeries and how they eat (diet modes the tier allows). Saves to the account.
import { useState } from 'react';
import { UpgradeCard } from '@/components/account/Upgrade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { ApiError, send } from '@/lib/api';
import { feature } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap, Gender, Kinship, Me, Person, PersonInput, Pregnancy } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

const RELATIONS: Kinship[] = ['me', 'spouse', 'child', 'parent', 'sibling', 'other'];

export function PersonForm({ boot, me, person, onSaved }: { boot: Bootstrap; me: Me; person: Person | null; onSaved: (id: number) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(person?.name ?? (me.name || t.account.me));
  const [relation, setRelation] = useState<Kinship>(person?.relation ?? 'me');
  const [birthYear, setBirthYear] = useState(person?.birth_year ? String(person.birth_year) : '');
  const [gender, setGender] = useState<Gender>(person?.gender ?? 'female');
  const [pregnancy, setPregnancy] = useState<Pregnancy>(person?.pregnancy ?? 'none');
  const [mode, setMode] = useState(person?.mode ?? 'everyday');
  const [conditions, setConditions] = useState<Record<string, string>>(() => Object.fromEntries((person?.conditions ?? []).map((row) => [row.condition.slug, row.diagnosed_year ? String(row.diagnosed_year) : ''])));
  const [allergies, setAllergies] = useState((person?.allergies ?? []).join('\n'));
  const [surgeries, setSurgeries] = useState((person?.surgeries ?? []).join('\n'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const modesAllowed = feature(me, 'diet_modes') !== 0;
  const conditionCap = feature(me, 'conditions');
  const chosen = Object.keys(conditions);
  const toggle = (slug: string) =>
    setConditions((now) => {
      const next = { ...now };
      if (slug in next) delete next[slug];
      else next[slug] = '';
      return next;
    });
  const save = async () => {
    setBusy(true);
    setErrors({});
    const year = (text: string) => (text.trim() ? Number(text.trim()) : undefined);
    const body: PersonInput = {
      name,
      relation,
      gender,
      pregnancy: gender === 'female' ? pregnancy : 'none',
      mode,
      allergies: allergies.split('\n'),
      surgeries: surgeries.split('\n'),
      conditions: chosen.map((slug) => {
        const diagnosed = year(conditions[slug] ?? '');
        return diagnosed === undefined ? { slug } : { slug, diagnosed_year: diagnosed };
      }),
      ...(year(birthYear) === undefined ? {} : { birth_year: year(birthYear) as number }),
    };
    try {
      // id 0 is a draft (from the quick builder on Today): it is created, not updated
      const saved = person && person.id > 0 ? await send<{ id: number }>(`/api/v1/me/profiles/${person.id}`, 'PUT', body) : await send<{ id: number }>('/api/v1/me/profiles', 'POST', body);
      onSaved(saved.id);
    } catch (error) {
      if (error instanceof ApiError) setErrors(Object.keys(error.fields).length ? error.fields : { name: error.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="person-name">{t.auth.name}</Label>
          <Input id="person-name" placeholder={t.ph.name} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name) || undefined} />
          {errors.name && <p className="text-footnote text-avoid-ink">{errors.name}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="person-year">{t.account.birthYear}</Label>
          <Input id="person-year" placeholder={t.ph.birthYear} inputMode="numeric" maxLength={4} value={birthYear} onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, ''))} aria-invalid={Boolean(errors.birth_year) || undefined} />
          {errors.birth_year && <p className="text-footnote text-avoid-ink">{errors.birth_year}</p>}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="min-w-0 max-w-full">
          <Segmented label={t.account.relation.me} value={relation} onChange={(value) => setRelation(value as Kinship)} options={RELATIONS.map((value) => ({ value, label: t.account.relation[value] }))} />
        </div>
        <Segmented label={t.profile.gender} value={gender} onChange={(value) => setGender(value as Gender)} options={(['female', 'male', 'other'] as Gender[]).map((value) => ({ value, label: t.gender[value] }))} />
        {gender === 'female' && (
          <div className="min-w-0 max-w-full">
            <Segmented label={t.account.pregnancy} value={pregnancy} onChange={(value) => setPregnancy(value as Pregnancy)} options={(['none', 'pregnant', 'breastfeeding'] as Pregnancy[]).map((value) => ({ value, label: t.account.pregnancyOptions[value] }))} />
          </div>
        )}
      </div>
      <section className="grid gap-3">
        <h3 className="text-headline">{t.account.conditions}</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {boot.conditions.map((condition) => {
            const on = condition.slug in conditions;
            return (
              <li key={condition.slug} className={cn('flex items-center gap-3 rounded-xl border p-3 transition-colors', on ? 'border-foreground bg-card' : 'bg-card')} style={tone(condition.color)}>
                <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(condition.slug)} className="press flex min-w-0 flex-1 items-center gap-2 text-left text-subhead font-semibold">
                  <i className="dot" /> {condition.name}
                </button>
                {on && (
                  <Input aria-label={`${condition.name}: ${t.account.diagnosed}`} placeholder={t.account.diagnosed} inputMode="numeric" maxLength={4} value={conditions[condition.slug] ?? ''} onChange={(event) => setConditions((now) => ({ ...now, [condition.slug]: event.target.value.replace(/\D/g, '') }))} className="!h-9 !w-28 shrink-0" />
                )}
              </li>
            );
          })}
        </ul>
        {conditionCap >= 0 && chosen.length > conditionCap && <UpgradeCard text={t.tiers.limitedConditions.replace('{list}', String(chosen.length - conditionCap))} />}
      </section>
      {boot.modes.length > 1 && (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <h3 className="text-headline">{t.modes.title}</h3>
          <div className="min-w-0 max-w-full">
            <Segmented label={t.modes.title} value={mode} onChange={setMode} options={boot.modes.map((item) => ({ value: item.slug, label: item.name }))} />
          </div>
          {!modesAllowed && mode !== 'everyday' && <UpgradeCard text={t.tiers.limitedMode} />}
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="allergies">{t.account.allergies}</Label>
          <textarea id="allergies" placeholder={t.ph.allergies} rows={3} value={allergies} onChange={(event) => setAllergies(event.target.value)} className="field rounded-xl p-3 text-subhead" />
          <p className="text-footnote text-muted-foreground">{t.account.allergiesHint}</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="surgeries">{t.account.surgeries}</Label>
          <textarea id="surgeries" placeholder={t.ph.surgeries} rows={3} value={surgeries} onChange={(event) => setSurgeries(event.target.value)} className="field rounded-xl p-3 text-subhead" />
          <p className="text-footnote text-muted-foreground">{t.account.surgeriesHint}</p>
        </div>
      </div>
      <Button onClick={() => void save()} state={busy ? 'busy' : 'idle'} className="w-fit">
        {t.account.save}
      </Button>
    </div>
  );
}
