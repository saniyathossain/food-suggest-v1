// Admin: a condition's symptoms and details, one box per part in each language, one line per bullet. Saving a part replaces its lines
// (PUT /api/v1/admin/conditions/{slug}/details); English and Bangla lines pair up by position. The lines come from the raw catalogue the admin already holds.
import { useState } from 'react';
import { Save } from '@/components/icons/page';
import { toast } from '@/components/kit/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { DetailKind, LocalizedText } from '@/lib/types';
import { refusalText, type Admin, type RawCondition } from './useAdmin';

type Row = { condition_id: number; kind: DetailKind; sort: number; text: LocalizedText };
const KINDS: DetailKind[] = ['about', 'symptoms', 'causes', 'see_doctor', 'urgent'];
const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

function Part({ admin, condition, kind, rows }: { admin: Admin; condition: RawCondition; kind: DetailKind; rows: Row[] }) {
  const { t, num } = useI18n();
  const copy = t.admin.conditionDetails;
  const [en, setEn] = useState(rows.map((row) => row.text.en).join('\n'));
  const [bn, setBn] = useState(rows.map((row) => row.text.bn).join('\n'));
  const [busy, setBusy] = useState(false);
  const english = lines(en);
  const bangla = lines(bn);
  const dirty = en !== rows.map((row) => row.text.en).join('\n') || bn !== rows.map((row) => row.text.bn).join('\n');
  const save = async () => {
    setBusy(true);
    try {
      await send(`/api/v1/admin/conditions/${condition.slug}/details`, 'PUT', { kind, items: english.map((line, at) => ({ en: line, bn: bangla[at] ?? '' })) }, admin.token);
      admin.saved();
    } catch (failure) {
      toast(refusalText(failure), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <fieldset className="grid gap-3 rounded-xl border bg-card/60 p-4">
      <legend className="px-1 text-subhead font-semibold">
        {t.conditionDetails.kinds[kind]} <span className="font-normal text-muted-foreground">· {copy.lines.replace('{n}', num(english.length))}</span>
      </legend>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`d-${kind}-en`}>{copy.en}</Label>
          <Textarea id={`d-${kind}-en`} rows={kind === 'about' ? 3 : 6} placeholder={copy.ph[kind]} value={en} onChange={(event) => setEn(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`d-${kind}-bn`}>{copy.bn}</Label>
          <Textarea id={`d-${kind}-bn`} lang="bn" rows={kind === 'about' ? 3 : 6} placeholder={copy.phBn[kind]} value={bn} onChange={(event) => setBn(event.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button icon={Save} size="sm" state={busy ? 'busy' : 'idle'} disabled={!dirty} onClick={() => void save()}>
          {t.admin.save}
        </Button>
        {bangla.length !== english.length && bangla.length > 0 && <p className="text-footnote text-limit-ink">{copy.mismatch}</p>}
      </div>
    </fieldset>
  );
}

export function ConditionDetails({ admin, condition }: { admin: Admin; condition: RawCondition }) {
  const { t } = useI18n();
  const all = ((admin.snapshot as unknown as { condition_details?: Row[] } | null)?.condition_details ?? []).filter((row) => row.condition_id === condition.id);
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <div>
        <h2 className="text-title-3">{t.admin.conditionDetails.title}</h2>
        <p className="mt-1 max-w-[70ch] text-footnote text-muted-foreground">{t.admin.conditionDetails.lead}</p>
      </div>
      {KINDS.map((kind) => (
        <Part key={`${kind}-${all.filter((row) => row.kind === kind).map((row) => row.text.en).join('|')}`} admin={admin} condition={condition} kind={kind} rows={all.filter((row) => row.kind === kind).sort((a, b) => a.sort - b.sort)} />
      ))}
    </section>
  );
}
