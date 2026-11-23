// A person's results over time: add a dated value (HbA1c, fasting sugar, TSH, ALT, haemoglobin, weight, blood pressure);
// each measure shows its latest value, the change since the first, and a small line of every reading. Values are the
// person's own; the app does not judge them.
import { Select } from '@/components/ui/select';
import { useState } from 'react';
import { UpgradeCard } from '@/components/account/Upgrade';
import { DatePicker } from '@/components/kit/datepicker';
import { CountUp } from '@/components/kit/countup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, send } from '@/lib/api';
import { feature } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Lab, LabKind, Me, Person } from '@/lib/types';

const KINDS: LabKind[] = ['hba1c', 'fasting_glucose', 'tsh', 'alt', 'hemoglobin', 'weight_kg', 'bp_systolic', 'bp_diastolic'];

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 36;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const points = values.map((value, index) => `${((index / (values.length - 1)) * width).toFixed(1)},${(height - 4 - ((value - low) / span) * (height - 8)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-[120px]" aria-hidden>
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="curve-draw" />
    </svg>
  );
}

export function LabsPanel({ me, person, onChanged }: { me: Me; person: Person; onChanged: () => void }) {
  const { t, num } = useI18n();
  const [kind, setKind] = useState<LabKind>('hba1c');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (feature(me, 'history') === 0) return <UpgradeCard />;
  const add = async () => {
    setBusy(true);
    setError('');
    try {
      await send(`/api/v1/me/profiles/${person.id}/labs`, 'POST', { kind, value: Number(value), taken_on: date, note: '' });
      setValue('');
      onChanged();
    } catch (failure) {
      setError(failure instanceof ApiError ? Object.values(failure.fields)[0] ?? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  const groups = KINDS.map((item) => ({ kind: item, rows: person.labs.filter((row: Lab) => row.kind === item) })).filter((group) => group.rows.length > 0);
  return (
    <div className="grid gap-6">
      <p className="text-subhead text-muted-foreground">{t.labs.lead}</p>
      {groups.length === 0 && <p className="text-subhead text-muted-foreground">{t.labs.empty}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ kind: item, rows }) => {
          const first = rows[0] as Lab;
          const last = rows[rows.length - 1] as Lab;
          const change = last.value - first.value;
          return (
            <li key={item} className="grid gap-2 rounded-2xl border bg-card p-4">
              <p className="text-footnote font-semibold text-muted-foreground">{t.labs.kinds[item]}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="flex items-baseline gap-1">
                  <CountUp value={last.value} digits={last.value % 1 === 0 ? 0 : 1} className="numeral text-title-1" />
                  <span className="text-footnote text-muted-foreground">{last.unit}</span>
                </p>
                <Spark values={rows.map((row) => row.value)} />
              </div>
              <p className="text-footnote text-muted-foreground">
                {last.taken_on}
                {rows.length > 1 && ` · ${change > 0 ? '+' : change < 0 ? '−' : '±'}${num(Math.abs(Math.round(change * 10) / 10))} ${t.labs.change}`}
              </p>
            </li>
          );
        })}
      </ul>
      <section className="surface grid gap-4 rounded-2xl p-5">
        <h3 className="text-headline">{t.labs.add}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="lab-kind">{t.labs.title}</Label>
            <Select id="lab-kind" value={kind} onChange={(event) => setKind(event.target.value as LabKind)} className="field h-11 rounded-xl px-3 text-subhead">
              {KINDS.map((item) => (
                <option key={item} value={item}>{t.labs.kinds[item]}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lab-value">{t.labs.value}</Label>
            <Input id="lab-value" placeholder={t.ph.labValue} inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value.replace(/[^\d.]/g, ''))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lab-date">{t.labs.date}</Label>
            <DatePicker id="lab-date" label={t.labs.date} value={date} max={new Date().toISOString().slice(0, 10)} onChange={setDate} />
          </div>
        </div>
        {error && <p role="alert" className="text-footnote text-avoid-ink">{error}</p>}
        <Button onClick={() => void add()} state={busy ? 'busy' : 'idle'} disabled={!value} className="w-fit">{t.labs.add}</Button>
      </section>
    </div>
  );
}
