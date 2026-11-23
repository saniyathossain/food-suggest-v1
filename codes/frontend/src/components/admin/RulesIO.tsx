// Admin: bulk edit and import / export of food rules. Bulk: one verdict (and a reason and source when a food has no rule yet)
// for many foods of a condition. Import: CSV or JSON, checked first ("check only"), refused rows named with their row number.
// Export: every rule, or one condition, as CSV or JSON. Rules changed by an import or bulk edit need review again.
import { useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { download } from '@/components/admin/useOps';
import { RemoteSelect } from '@/components/kit/remoteselect';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Database, Upload } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { VERDICTS } from '@/components/Verdict';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ImportIssue, RuleBulkResult, RuleImportResult, Verdict } from '@/lib/types';

function Issues({ items }: { items: ImportIssue[] }) {
  const { t, num } = useI18n();
  if (items.length === 0) return null;
  return (
    <div className="grid gap-1">
      <strong className="text-subhead">{t.admin.ops.rejected}</strong>
      <ul className="max-h-48 overflow-auto rounded-xl border bg-card p-3 text-footnote">
        {items.map((item) => (
          <li key={`${item.row}-${item.message}`}>{t.admin.ops.row} {num(item.row)}: {item.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function RulesIO({ admin }: { admin: Admin }) {
  const { t, num } = useI18n();
  const conditions = admin.snapshot?.conditions ?? [];
  const [condition, setCondition] = useState(conditions[0]?.slug ?? '');
  const [foods, setFoods] = useState('');
  const [verdict, setVerdict] = useState<Verdict>('limit');
  const [reasonEn, setReasonEn] = useState('');
  const [reasonBn, setReasonBn] = useState('');
  const [source, setSource] = useState('');
  const [bulk, setBulk] = useState<RuleBulkResult | null>(null);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [data, setData] = useState('');
  const [dry, setDry] = useState(true);
  const [report, setReport] = useState<RuleImportResult | null>(null);
  const [exportOf, setExportOf] = useState('');
  const [busy, setBusy] = useState('');
  const run = async (name: string, work: () => Promise<void>) => {
    setBusy(name);
    try {
      await work();
    } catch (failure) {
      toast(refusalText(failure));
    } finally {
      setBusy('');
    }
  };
  const applyBulk = () =>
    run('bulk', async () => {
      const slugs = foods.split(/[\s,]+/).filter(Boolean);
      const result = await send<RuleBulkResult>('/api/v1/admin/food-rules/bulk', 'POST', { condition, foods: slugs, verdict, ...(reasonEn.trim() ? { reason: { en: reasonEn, bn: reasonBn } } : {}), ...(source.trim() ? { source: source.trim() } : {}) }, admin.token);
      setBulk(result);
      toast(t.admin.ops.bulkDone);
      admin.saved();
    });
  const runImport = () =>
    run('import', async () => {
      const result = await send<RuleImportResult>('/api/v1/admin/food-rules/import', 'POST', { format, data, dry_run: dry }, admin.token);
      setReport(result);
      if (!result.dry_run) {
        toast(t.admin.saved);
        admin.saved();
      }
    });
  const getFile = (kind: 'csv' | 'json') =>
    run(`export-${kind}`, () => download(`/api/v1/admin/food-rules/export?format=${kind}${exportOf ? `&condition=${exportOf}` : ''}`, admin.token, `pathya-rules${exportOf ? `-${exportOf}` : ''}.${kind}`));
  return (
    <div className="grid gap-6">
      <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
        <SectionTitle icon={Database} title={t.admin.ops.sections.rulesio} lead={t.admin.ops.leads.rulesio} accent="saffron" className="mb-0" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="bulk-condition">{t.admin.ops.pickCondition}</Label>
            <RemoteSelect kind="conditions" token={admin.token} id="bulk-condition" value={condition} onChange={setCondition} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bulk-verdict">{t.admin.ops.verdictFor}</Label>
            <Select id="bulk-verdict" value={verdict} onChange={(event) => setVerdict(event.target.value as Verdict)}>
              {VERDICTS.map((item) => <option key={item} value={item}>{t.verdict[item]}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bulk-foods">{t.admin.ops.pickFoods}</Label>
          <Textarea id="bulk-foods" rows={3} value={foods} onChange={(event) => setFoods(event.target.value)} placeholder="white-rice, maida, biscuits" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5"><Label htmlFor="bulk-en">{t.admin.ops.reasonEn}</Label><Input id="bulk-en" value={reasonEn} onChange={(event) => setReasonEn(event.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bulk-bn">{t.admin.ops.reasonBn}</Label><Input id="bulk-bn" value={reasonBn} onChange={(event) => setReasonBn(event.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bulk-src">{t.admin.ops.sourceKey}</Label><Input id="bulk-src" value={source} onChange={(event) => setSource(event.target.value)} placeholder="nhs-pmos" /></div>
        </div>
        <Button className="w-fit" state={busy === 'bulk' ? 'busy' : 'idle'} disabled={!foods.trim() || !condition} onClick={() => void applyBulk()}>{t.admin.ops.applyBulk}</Button>
        {bulk && (
          <div className="grid gap-2 text-subhead">
            <p>{num(bulk.created)} {t.admin.ops.created} · {num(bulk.updated)} {t.admin.ops.updated} · {num(bulk.skipped.length)} {t.admin.ops.skipped}</p>
            <Issues items={bulk.skipped} />
          </div>
        )}
      </section>
      <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
        <SectionTitle icon={Upload} title={t.admin.ops.importTitle} lead={t.admin.ops.importLead} accent="mango" className="mb-0" />
        <Segmented label={t.admin.ops.importFormat} value={format} onChange={(value) => setFormat(value as 'csv' | 'json')} options={[{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }]} />
        <div className="grid gap-1.5">
          <Label htmlFor="import-data">{t.admin.ops.paste}</Label>
          <Textarea id="import-data" rows={6} value={data} onChange={(event) => setData(event.target.value)} className="font-mono text-footnote" />
        </div>
        <label className="flex items-center gap-2 text-subhead">
          <input type="checkbox" checked={dry} onChange={(event) => setDry(event.target.checked)} /> {t.admin.ops.dryRun}
        </label>
        <Button className="w-fit" state={busy === 'import' ? 'busy' : 'idle'} disabled={!data.trim()} onClick={() => void runImport()}>{t.admin.ops.runImport}</Button>
        {report && (
          <div className="grid gap-2 text-subhead">
            <p>{report.dry_run ? `${t.admin.ops.checked}: ` : ''}{num(report.rows)} {t.admin.ops.rowsLabel} · {num(report.created)} {t.admin.ops.created} · {num(report.updated)} {t.admin.ops.updated} · {num(report.rejected.length)} {t.admin.ops.rejected.toLowerCase()}</p>
            <Issues items={report.rejected} />
          </div>
        )}
      </section>
      <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
        <SectionTitle icon={Database} title={t.admin.ops.exportTitle} accent="river" className="mb-0" />
        <div className="flex flex-wrap items-end gap-3">
          <RemoteSelect kind="conditions" token={admin.token} aria-label={t.admin.ops.pickCondition} className="max-w-xs" value={exportOf} emptyLabel={t.admin.ops.allConditions} onChange={setExportOf} />
          <Button variant="outline" state={busy === 'export-csv' ? 'busy' : 'idle'} onClick={() => void getFile('csv')}>{t.admin.ops.exportCsv}</Button>
          <Button variant="outline" state={busy === 'export-json' ? 'busy' : 'idle'} onClick={() => void getFile('json')}>{t.admin.ops.exportJson}</Button>
        </div>
      </section>
    </div>
  );
}
