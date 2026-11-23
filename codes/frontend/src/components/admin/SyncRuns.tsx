// Super admin: the history of external sync runs, newest first, paged on the server. Filter by source and by result; each row shows
// how many attempts the run took and what it saved, and the error text when it failed.
import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusBadge, useWhen } from '@/components/admin/syncParts';
import { type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { Clock } from '@/components/icons/page';
import { Select } from '@/components/ui/select';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Page, SyncRun, SyncSource, SyncStatus } from '@/lib/types';

const STATUSES: SyncStatus[] = ['running', 'ok', 'failed'];

export function SyncRuns({ admin, sources, refresh }: { admin: Admin; sources: SyncSource[]; refresh: number }) {
  const { t, num } = useI18n();
  const copy = t.admin.syncSources;
  const when = useWhen();
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [data, setData] = useState<Page<SyncRun> | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(source ? { source } : {}), ...(status ? { status } : {}), ...(query.trim() ? { q: query.trim() } : {}) });
      void send<Page<SyncRun>>(`/api/v1/admin/sync-runs?${params}`, 'GET', undefined, admin.token).then(setData).catch(() => undefined).finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [source, status, query, page, perPage, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = data?.items ?? [];
  const columns: Column<SyncRun>[] = [
    {
      key: 'source',
      label: copy.source,
      sort: (first, second) => first.source_name.localeCompare(second.source_name),
      text: (row) => row.source,
      cell: (row) => (
        <span className="grid min-w-0">
          <strong className="truncate">{row.source_name}</strong>
          <span className="text-caption text-muted-foreground">{when(Number(row.started_at))} · {copy.by[row.started_by === 'schedule' ? 'schedule' : 'manual']}</span>
        </span>
      ),
    },
    { key: 'status', label: t.admin.modeStatus, sort: (first, second) => first.status.localeCompare(second.status), text: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'attempts', label: copy.attempts, align: 'end', sort: (first, second) => first.attempts - second.attempts, text: (row) => row.attempts, cell: (row) => num(row.attempts) },
    { key: 'seen', label: copy.seen, align: 'end', hideBelow: 'sm', text: (row) => row.rows_seen, cell: (row) => num(row.rows_seen) },
    { key: 'created', label: copy.created, align: 'end', hideBelow: 'md', text: (row) => row.rows_created, cell: (row) => num(row.rows_created) },
    { key: 'updated', label: copy.updated, align: 'end', hideBelow: 'md', text: (row) => row.rows_updated, cell: (row) => num(row.rows_updated) },
    { key: 'skipped', label: copy.skipped, align: 'end', hideBelow: 'md', text: (row) => row.rows_skipped, cell: (row) => num(row.rows_skipped) },
    { key: 'finished', label: copy.finished, hideBelow: 'lg', text: (row) => (row.finished_at ? when(Number(row.finished_at)) : ''), cell: (row) => <span className="whitespace-nowrap text-footnote text-muted-foreground">{when(row.finished_at)}</span> },
    { key: 'error', label: copy.error, hideBelow: 'lg', text: (row) => row.error ?? '', cell: (row) => <span className="block max-w-[36ch] truncate text-footnote text-avoid-ink" title={row.error ?? ''}>{row.error ?? ''}</span> },
  ];
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Clock} title={copy.runsTitle} lead={copy.runsLead} accent="river" className="mb-0" />
      <DataTable
        label={copy.runsTitle}
        rows={rows}
        columns={columns}
        rowKey={(row) => String(row.id)}
        exportName="sync-runs"
        empty={<p className="text-center text-subhead text-muted-foreground">{copy.noRuns}</p>}
        server={{ total: Number(data?.total ?? 0), page, perPage: Number(data?.per_page ?? perPage), onPage: setPage, query, onQuery: setQuery, loading, onPerPage: setPerPage }}
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <Select value={source} onChange={(event) => { setSource(event.target.value); setPage(0); }} aria-label={copy.source} className="h-10 min-w-48 rounded-full">
              <option value="">{copy.allSources}</option>
              {sources.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </Select>
            <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} aria-label={copy.filterStatus}>
              <option value="">{copy.all}</option>
              {STATUSES.map((value) => <option key={value} value={value}>{copy.status[value]}</option>)}
            </Select>
          </div>
        }
      />
    </section>
  );
}
