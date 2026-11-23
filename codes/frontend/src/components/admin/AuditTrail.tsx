// Admin: the audit trail. Who changed what, newest first, filtered by action and subject. A row opens a side panel with the
// full detail of the change (a plain panel, not a modal, so it needs no page-scroll lock).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { type Admin } from '@/components/admin/useAdmin';
import { useGet } from '@/components/admin/useOps';
import { SectionTitle } from '@/components/kit/section';
import { Server, X } from '@/components/icons/page';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import type { AuditRow, Page } from '@/lib/types';

export function AuditTrail({ admin }: { admin: Admin }) {
  const { t } = useI18n();
  const [action, setAction] = useState('');
  const [text, setText] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [open, setOpen] = useState<AuditRow | null>(null);
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(action.trim() ? { action: action.trim() } : {}), ...(text.trim() ? { q: text.trim() } : {}) });
  const { data, error } = useGet<Page<AuditRow>>(`/api/v1/admin/audit?${query.toString()}`, admin.token);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const columns: Column<AuditRow>[] = [
    { key: 'at', label: t.admin.ops.when, sort: (first, second) => first.at.localeCompare(second.at), text: (row) => row.at, cell: (row) => <span className="whitespace-nowrap text-footnote">{row.at.replace('T', ' ').slice(0, 16)}</span> },
    { key: 'who', label: t.admin.ops.who, hideBelow: 'sm', sort: (first, second) => (first.who ?? '').localeCompare(second.who ?? ''), text: (row) => row.who ?? '', cell: (row) => <span className="text-footnote">{row.who ?? t.admin.ops.tokenActor}</span> },
    { key: 'action', label: t.admin.ops.action, sort: (first, second) => first.action.localeCompare(second.action), text: (row) => row.action, cell: (row) => <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold">{row.action}</span> },
    { key: 'subject', label: t.admin.ops.subject, text: (row) => row.subject, cell: (row) => <span className="block max-w-[34ch] truncate">{row.subject}</span> },
  ];
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Server} title={t.admin.ops.sections.audit} lead={t.admin.ops.leads.audit} accent="aubergine" className="mb-0" />
      {error && <p role="alert" className="text-footnote text-avoid-ink">{error}</p>}
      <DataTable
        label={t.admin.ops.sections.audit}
        rows={data?.items ?? []}
        columns={columns}
        rowKey={(row) => String(row.id)}
        onRow={setOpen}
        exportName="audit"
        empty={<p className="text-center text-subhead text-muted-foreground">{t.admin.none}</p>}
        server={{ total: Number(data?.total ?? 0), page, perPage: Number(data?.per_page ?? 25), onPage: setPage, query: text, onQuery: setText, onPerPage: setPerPage }}
        filters={<Input value={action} onChange={(event) => { setAction(event.target.value); setPage(0); }} placeholder={t.admin.ops.filterAction} aria-label={t.admin.ops.filterAction} className="max-w-56 !rounded-full" />}
      />
      {open && createPortal(
        <aside role="dialog" aria-label={t.admin.ops.detail} className="surface fixed inset-y-0 right-0 z-[100] grid w-full max-w-md content-start gap-4 overflow-y-auto rounded-l-[28px] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption text-muted-foreground">{open.at.replace('T', ' ')}</p>
              <h3 className="text-title-3">{open.action}</h3>
              <p className="text-subhead text-muted-foreground">{open.subject}</p>
            </div>
            <IconButton icon={X} label={t.admin.ops.closeDetail} onClick={() => setOpen(null)} />
          </div>
          <p className="text-footnote">{t.admin.ops.who}: {open.who ?? t.admin.ops.tokenActor}</p>
          <dl className="grid gap-2 text-footnote">
            {Object.entries(open.detail).map(([key, value]) => (
              <div key={key} className="rounded-xl border bg-card p-3">
                <dt className="font-semibold">{key}</dt>
                <dd className="mt-1 break-words text-muted-foreground">{typeof value === 'string' ? value : JSON.stringify(value)}</dd>
              </div>
            ))}
          </dl>
        </aside>,
        document.body,
      )}
    </section>
  );
}
