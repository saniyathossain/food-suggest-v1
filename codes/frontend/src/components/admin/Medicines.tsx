// Admin: medicines. Paste or choose a CSV (generic, group, brand, company, strength, form) to add brands; search the
// brands; and per generic, see its conflict count and pull its US label from openFDA for review ("Sync label"). The label
// text is for staff only; nothing from it reaches the public until someone writes it up with a source.
import { useEffect, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Pill } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n, useT } from '@/lib/i18n';
import { useJobIsland } from '@/components/island/useJobIsland';
import type { GenericAdmin, ImportResult, LabelSync, MedicineAdmin, Page } from '@/lib/types';

export function Medicines({ admin }: { admin: Admin }) {
  const { t, num } = useI18n();
  const translate = useT();
  // the CSV import and a label sync run for a while with no progress to report: the island shows them until they end
  const track = useJobIsland();
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [brands, setBrands] = useState<Page<MedicineAdmin> | null>(null);
  const [generics, setGenerics] = useState<GenericAdmin[]>([]);
  const [label, setLabel] = useState<LabelSync | null>(null);
  const loadBrands = () => void send<Page<MedicineAdmin>>(`/api/v1/admin/medicines?page=${page}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`, 'GET', undefined, admin.token).then(setBrands).catch(() => undefined);
  const loadGenerics = () => void send<GenericAdmin[]>('/api/v1/admin/generics', 'GET', undefined, admin.token).then(setGenerics).catch(() => undefined);
  useEffect(() => {
    const timer = window.setTimeout(loadBrands, 200);
    return () => window.clearTimeout(timer);
  }, [query, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(loadGenerics, []); // eslint-disable-line react-hooks/exhaustive-deps
  const importCsv = async () => {
    setBusy(true);
    try {
      const result = await track({ label: t.island.importing, title: t.island.medicines }, send<ImportResult>('/api/v1/admin/medicines/import', 'POST', { csv }, admin.token));
      toast(t.admin.imported.replace('{g}', num(result.generics)).replace('{b}', num(result.brands)).replace('{s}', num(result.skipped)));
      setCsv('');
      loadBrands();
      loadGenerics();
    } catch (error) {
      toast(refusalText(error));
    } finally {
      setBusy(false);
    }
  };
  const sync = async (slug: string) => {
    try {
      const result = await track({ label: t.island.syncing, title: translate('island.syncWhat', slug) }, send<LabelSync>(`/api/v1/admin/generics/${slug}/sync`, 'POST', undefined, admin.token));
      setLabel(result);
      toast(result.found ? t.admin.synced : t.admin.notFound);
      loadGenerics();
    } catch (error) {
      toast(refusalText(error));
    }
  };
  const pages = brands ? Math.max(1, Math.ceil(Number(brands.total) / Number(brands.per_page))) : 1;
  return (
    <section className="surface grid gap-5 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Pill} title={t.admin.medicinesTitle} lead={t.admin.medicinesLead} accent="river" className="mb-0" />
      <div className="grid gap-2">
        <Label htmlFor="csv">{t.admin.csv}</Label>
        <textarea id="csv" rows={4} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="generic,group,brand,company,strength,form" className="field rounded-xl p-3 font-mono text-footnote" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="chip press cursor-pointer">
            {t.admin.chooseFile}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void event.target.files?.[0]?.text().then(setCsv)} />
          </label>
          <Button onClick={() => void importCsv()} state={busy ? 'busy' : 'idle'} disabled={!csv.trim()}>{t.admin.import}</Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="grid content-start gap-3">
          <h3 className="text-headline">{t.admin.generics}</h3>
          <ul className="grid divide-y rounded-xl border">
            {generics.map((item) => (
              <li key={item.slug} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="grid">
                  <strong className="text-subhead">{item.name}</strong>
                  <span className="text-footnote text-muted-foreground">
                    {item.group} · {num(item.conflicts)} {t.admin.conflicts}
                    {item.label_synced ? ` · ${t.admin.synced} ${item.label_synced}` : ''}
                  </span>
                </span>
                <Button variant="outline" size="sm" onClick={() => void sync(item.slug)}>{t.admin.sync}</Button>
              </li>
            ))}
          </ul>
          {label?.excerpt && (
            <div className="grid gap-2 rounded-xl bg-muted p-3">
              <p className="text-footnote font-semibold">{t.admin.labelReview} · {label.slug}</p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-caption">{label.excerpt}</pre>
            </div>
          )}
        </div>
        <div className="grid content-start gap-3">
          <h3 className="text-headline">{t.admin.brands}</h3>
          <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder={t.meds.search} aria-label={t.meds.search} />
          <ul className="grid divide-y rounded-xl border">
            {brands?.items.map((item) => (
              <li key={item.id} className="grid px-3.5 py-2.5 text-subhead">
                <strong>{item.brand} <span className="font-normal text-muted-foreground">· {item.strength} · {item.form}</span></strong>
                <span className="text-footnote text-muted-foreground">{item.generic} · {item.company}</span>
              </li>
            ))}
            {brands?.items.length === 0 && <li className="px-3.5 py-4 text-center text-muted-foreground">{t.admin.none}</li>}
          </ul>
          <div className="flex items-center justify-between text-footnote text-muted-foreground">
            <span>{t.admin.pageOf.replace('{n}', num(page + 1)).replace('{m}', num(pages))}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{t.admin.previous}</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t.admin.next}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
