// Blood pressure, one pair at a time: the person types the top and bottom number from their cuff, the app saves both (as the two lab
// kinds the engine already reads), and the finding comes back from the plan: low, in the usual range, a little high or high, with the
// cited words and a pointer to the matching condition page. The thresholds live in the API (services/criteria.rs), never here.
import { useCallback, useEffect, useState } from 'react';
import { UpgradeCard } from '@/components/account/Upgrade';
import { DatePicker } from '@/components/kit/datepicker';
import { CountUp } from '@/components/kit/countup';
import { ActionButton } from '@/components/ui/action-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, send } from '@/lib/api';
import { feature } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Band, Lab, Me, Person, PersonalPlan } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONE: Record<Band, string> = { low: 'var(--tone-sky)', typical: 'var(--recommended)', raised: 'var(--limit)', high: 'var(--avoid)' };

function Trend({ systolic, diastolic }: { systolic: number[]; diastolic: number[] }) {
  if (systolic.length < 2) return null;
  const width = 240;
  const height = 64;
  const all = [...systolic, ...diastolic];
  const low = Math.min(...all) - 4;
  const span = Math.max(...all) + 4 - low;
  const line = (values: number[]) => values.map((value, index) => `${((index / (values.length - 1)) * width).toFixed(1)},${(height - 4 - ((value - low) / span) * (height - 8)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full max-w-[240px]" aria-hidden>
      <polyline points={line(systolic)} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={line(diastolic)} fill="none" stroke="var(--tone-sky)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BloodPressureCard({ me, person, onChanged }: { me: Me; person: Person; onChanged: () => void }) {
  const { t, lang } = useI18n();
  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<PersonalPlan | null>(null);
  const pressures = (kind: Lab['kind']) => person.labs.filter((row) => row.kind === kind).sort((first, second) => first.taken_on.localeCompare(second.taken_on));
  const systolic = pressures('bp_systolic');
  const diastolic = pressures('bp_diastolic');
  const upper = systolic[systolic.length - 1];
  const lower = diastolic[diastolic.length - 1];
  const loadPlan = useCallback(async () => {
    try {
      setPlan(await send<PersonalPlan>(`/api/v1/me/plan?profile=${person.id}&lang=${lang}`, 'GET'));
    } catch {
      setPlan(null);
    }
  }, [person.id, lang]);
  useEffect(() => {
    if (upper && lower) void loadPlan();
  }, [upper?.id, lower?.id, loadPlan]);
  if (feature(me, 'history') === 0) return <UpgradeCard />;
  const finding = plan?.plan.insights.find((item) => item.criterion === 'blood_pressure');
  const save = async () => {
    setError('');
    const high = Number(top);
    const low = Number(bottom);
    if (!high || !low || high <= low) {
      setError(t.bp.check);
      throw new Error('bp');
    }
    try {
      await send(`/api/v1/me/profiles/${person.id}/labs`, 'POST', { kind: 'bp_systolic', value: high, taken_on: date, note: '' });
      await send(`/api/v1/me/profiles/${person.id}/labs`, 'POST', { kind: 'bp_diastolic', value: low, taken_on: date, note: '' });
      setTop('');
      setBottom('');
      onChanged();
    } catch (failure) {
      setError(failure instanceof ApiError ? Object.values(failure.fields)[0] ?? failure.message : String(failure));
      throw failure;
    }
  };
  const band = finding?.band;
  return (
    <section aria-labelledby="bp-title" className="surface grid gap-5 rounded-[28px] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid content-start gap-4">
        <h3 id="bp-title" className="text-title-3 font-bold">{t.bp.title}</h3>
        {upper && lower ? (
          <div className="grid gap-3">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="numeral text-[44px] leading-none"><CountUp value={upper.value} digits={0} />/<CountUp value={lower.value} digits={0} /></span>
              <span className="text-footnote text-muted-foreground">{t.bp.unit}</span>
              {band && (
                <span className="rounded-full px-3 py-1 text-footnote font-bold" style={{ background: `color-mix(in srgb, ${TONE[band]} 16%, var(--card))`, color: `color-mix(in srgb, ${TONE[band]} 75%, var(--foreground))` }}>
                  {t.bp.bands[band]}
                </span>
              )}
            </p>
            <p className="text-footnote text-muted-foreground">{upper.taken_on}</p>
            <Trend systolic={systolic.map((row) => row.value)} diastolic={diastolic.map((row) => row.value)} />
          </div>
        ) : (
          <p className="text-subhead text-muted-foreground">{t.bp.none}</p>
        )}
        {finding && (
          <div className={cn('grid gap-1.5 rounded-2xl border p-4')} style={{ borderColor: `color-mix(in srgb, ${TONE[finding.band]} 40%, transparent)` }}>
            <strong className="text-subhead">{finding.title}</strong>
            <p className="text-footnote text-muted-foreground">{finding.detail}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
              {finding.source && <span>{finding.source.publisher}: {finding.source.title}</span>}
              {finding.suggests && (
                <a href={`/condition/${finding.suggests.slug}`} onClick={onLink} className="font-semibold text-primary hover:underline">
                  {t.bp.openPage.replace('{name}', finding.suggests.name)}
                </a>
              )}
            </p>
          </div>
        )}
      </div>
      <div className="grid content-start gap-4 rounded-2xl bg-muted/50 p-4">
        <p className="text-subhead font-semibold">{t.bp.add}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bp-top">{t.bp.top}</Label>
            <Input id="bp-top" inputMode="numeric" value={top} onChange={(event) => setTop(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="120" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bp-bottom">{t.bp.bottom}</Label>
            <Input id="bp-bottom" inputMode="numeric" value={bottom} onChange={(event) => setBottom(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="80" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bp-date">{t.bp.date}</Label>
          <DatePicker id="bp-date" label={t.bp.date} value={date} max={new Date().toISOString().slice(0, 10)} onChange={setDate} />
        </div>
        {error && <p role="alert" className="text-footnote font-semibold text-avoid-ink">{error}</p>}
        <ActionButton onClick={save} className="w-fit">{t.bp.save}</ActionButton>
        <p className="text-caption text-muted-foreground">{t.bp.note}</p>
      </div>
    </section>
  );
}
