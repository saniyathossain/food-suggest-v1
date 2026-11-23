// Admin: medicines. Two tables: the generics (photo, name, group, when to take it, how many conflicts, when the openFDA label was last pulled,
// and a "Sync label" button) and the brands sold in Bangladesh, paged on the server with a page-size choice. Paste or choose a CSV
// (generic, group, brand, company, strength, form) to add brands. A label is for staff only; nothing from it reaches the public until
// someone writes it up with a source.
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { MediaPick } from '@/components/admin/MediaPick';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { FilterChip } from '@/components/kit/filterchip';
import { toast } from '@/components/kit/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { toggle } from '@/lib/foodfilters';
import { useI18n, useT } from '@/lib/i18n';
import { useJobIsland } from '@/components/island/useJobIsland';
import type { FoodTiming, GenericAdmin, ImportResult, LabelSync, MedicineAdmin, Page } from '@/lib/types';

const TIMINGS: FoodTiming[] = ['empty_stomach', 'before_food', 'with_food', 'after_food', 'any'];

export function Medicines({ admin }: { admin: Admin }) {
  const { t, num } = useI18n();
  const translate = useT();
  // the CSV import and a label sync run for a while with no progress to report: the island shows them until they end
  const track = useJobIsland();
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [brands, setBrands] = useState<Page<MedicineAdmin> | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [generics, setGenerics] = useState<GenericAdmin[]>([]);
  const [timings, setTimings] = useState<FoodTiming[]>([]);
  const [label, setLabel] = useState<LabelSync | null>(null);
  const loadBrands = () => {
    setLoadingBrands(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(query.trim() ? { q: query.trim() } : {}) });
    void send<Page<MedicineAdmin>>(`/api/v1/admin/medicines?${params}`, 'GET', undefined, admin.token)
      .then(setBrands)
      .catch(() => undefined)
      .finally(() => setLoadingBrands(false));
  };
  const loadGenerics = () => void send<GenericAdmin[]>('/api/v1/admin/generics', 'GET', undefined, admin.token).then(setGenerics).catch(() => undefined);
  useEffect(() => {
    const timer = window.setTimeout(loadBrands, 200);
    return () => window.clearTimeout(timer);
  }, [query, page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps
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
      toast(refusalText(error), 'bad');
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
      toast(refusalText(error), 'bad');
    }
  };
  const photo = async (slug: string, id: number) => {
    try {
      await send(`/api/v1/admin/generics/${slug}/media`, 'PATCH', { media_id: id }, admin.token);
      admin.saved();
      loadGenerics();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const rows = useMemo(() => generics.filter((item) => timings.length === 0 || timings.includes(item.food_timing)), [generics, timings]);
  const genericColumns: Column<GenericAdmin>[] = [
    {
      key: 'name',
      label: t.admin.generics,
      sort: (first, second) => first.name.localeCompare(second.name),
      text: (item) => item.name,
      cell: (item) => (
        <span className="flex items-center gap-3">
          <MediaPick media={admin.media} value={item.media_id} image={item.image} label={t.admin.photoFor.replace('{name}', item.name)} onPick={(id) => void photo(item.slug, id)} />
          <strong className="min-w-0 truncate">{item.name}</strong>
        </span>
      ),
    },
    { key: 'group', label: t.admin.foodsTable.group, sort: (first, second) => first.group.localeCompare(second.group), text: (item) => item.group, hideBelow: 'sm', cell: (item) => <span className="text-muted-foreground">{item.group}</span> },
    { key: 'timing', label: t.meds.food, sort: (first, second) => first.food_timing.localeCompare(second.food_timing), text: (item) => item.food_timing, hideBelow: 'md', cell: (item) => <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary">{t.meds.foodOptions[item.food_timing]}</span> },
    { key: 'conflicts', label: t.admin.conflicts.charAt(0).toUpperCase() + t.admin.conflicts.slice(1), align: 'end', sort: (first, second) => first.conflicts - second.conflicts, text: (item) => item.conflicts, hideBelow: 'sm', cell: (item) => num(item.conflicts) },
    { key: 'synced', label: t.admin.synced, sort: (first, second) => (first.label_synced ?? '').localeCompare(second.label_synced ?? ''), text: (item) => item.label_synced ?? '', hideBelow: 'lg', cell: (item) => <span className="text-footnote text-muted-foreground">{item.label_synced ?? '—'}</span> },
    { key: 'sync', label: '', align: 'end', cell: (item) => <Button variant="outline" size="sm" onClick={() => void sync(item.slug)}>{t.admin.sync}</Button> },
  ];
  const brandColumns: Column<MedicineAdmin>[] = [
    { key: 'brand', label: t.admin.brands, sort: (first, second) => first.brand.localeCompare(second.brand), text: (item) => item.brand, cell: (item) => <strong>{item.brand}</strong> },
    { key: 'generic', label: t.admin.generics, sort: (first, second) => first.generic.localeCompare(second.generic), text: (item) => item.generic, hideBelow: 'sm', cell: (item) => <span className="text-muted-foreground">{item.generic}</span> },
    { key: 'strength', label: t.admin.strength, text: (item) => item.strength, hideBelow: 'md', cell: (item) => item.strength },
    { key: 'form', label: t.admin.form, text: (item) => item.form, hideBelow: 'md', cell: (item) => <span className="capitalize">{item.form}</span> },
    { key: 'company', label: t.admin.company, sort: (first, second) => first.company.localeCompare(second.company), text: (item) => item.company, hideBelow: 'lg', cell: (item) => <span className="text-muted-foreground">{item.company}</span> },
  ];
  return (
    <div className="grid gap-6">
      <section className="surface grid gap-3 rounded-2xl p-5 sm:p-6">
        <Label htmlFor="csv" className="text-headline">{t.admin.csv}</Label>
        <textarea id="csv" rows={3} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="generic,group,brand,company,strength,form" className="field rounded-xl p-3 font-mono text-footnote" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="chip press cursor-pointer">
            {t.admin.chooseFile}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void event.target.files?.[0]?.text().then(setCsv)} />
          </label>
          <Button onClick={() => void importCsv()} state={busy ? 'busy' : 'idle'} disabled={!csv.trim()}>{t.admin.import}</Button>
        </div>
      </section>
      <DataTable
        label={t.admin.generics}
        rows={rows}
        columns={genericColumns}
        rowKey={(item) => item.slug}
        searchText={(item) => `${item.name} ${item.group}`.toLowerCase()}
        initialSort={{ key: 'name', dir: 'asc' }}
        exportName="medicines"
        empty={<p className="text-center text-subhead text-muted-foreground">{t.table.noRows}</p>}
        filters={
          <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.library.when}>
            {TIMINGS.map((value) => (
              <FilterChip key={value} on={timings.includes(value)} onClick={() => setTimings(toggle(timings, value) as FoodTiming[])} label={t.meds.foodOptions[value]} count={generics.filter((item) => item.food_timing === value).length} />
            ))}
          </div>
        }
      />
      {label?.excerpt && (
        <section className="surface-soft grid gap-2 rounded-2xl p-4">
          <p className="text-footnote font-semibold">{t.admin.labelReview} · {label.slug}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-caption">{label.excerpt}</pre>
        </section>
      )}
      <DataTable
        label={t.admin.brands}
        rows={brands?.items ?? []}
        columns={brandColumns}
        rowKey={(item) => String(item.id)}
        exportName="brands"
        empty={<p className="text-center text-subhead text-muted-foreground">{t.admin.none}</p>}
        server={{ total: Number(brands?.total ?? 0), page, perPage: Number(brands?.per_page ?? perPage), onPage: setPage, query, onQuery: setQuery, loading: loadingBrands, onPerPage: setPerPage }}
      />
    </div>
  );
}
