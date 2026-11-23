// Admin: payments, newest first, 25 a page. Filter by status and gateway, search by email, payment id or TrxID. Manual
// transfers waiting for review get Approve (the account moves to the tier) and Reject; a paid one can be marked refunded
// (the money goes back through the gateway's own panel; switch the tier in Accounts if needed).
import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Select } from '@/components/ui/select';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { CreditCard } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { send } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import type { Page, PaymentAdmin, PaymentStatus } from '@/lib/types';

const STATUSES: PaymentStatus[] = ['review', 'pending', 'paid', 'failed', 'cancelled', 'refunded'];

export function Payments({ admin }: { admin: Admin }) {
  const { t, num, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [data, setData] = useState<Page<PaymentAdmin> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => {
    setBusy(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(query.trim() ? { q: query.trim() } : {}), ...(status ? { status } : {}) });
    void send<Page<PaymentAdmin>>(`/api/v1/admin/payments?${params}`, 'GET', undefined, admin.token).then(setData).catch(() => undefined).finally(() => setBusy(false));
  };
  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [query, status, page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps
  const refund = async (row: PaymentAdmin) => {
    if (await confirmDialog({ title: t.admin.refundTitle, body: t.admin.refundBody, action: t.admin.refund, tone: 'danger' })) await decide(row, 'refunded');
  };
  const decide = async (row: PaymentAdmin, next: PaymentStatus) => {
    try {
      await send(`/api/v1/admin/payments/${row.id}`, 'PATCH', { status: next }, admin.token);
      toast(t.admin.saved);
      load();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const when = (seconds: number) => new Date(seconds * 1000).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const columns: Column<PaymentAdmin>[] = [
    {
      key: 'email',
      label: t.auth.email,
      sort: (first, second) => first.email.localeCompare(second.email),
      text: (row) => row.email,
      cell: (row) => (
        <span className="grid">
          <strong>{row.email || '—'}</strong>
          <span className="text-caption text-muted-foreground">{when(Number(row.created_at))} · {row.id}</span>
        </span>
      ),
    },
    { key: 'tier', label: t.admin.tier, hideBelow: 'sm', sort: (first, second) => first.tier.localeCompare(second.tier), text: (row) => `${row.tier} x ${row.months}`, cell: (row) => `${row.tier} × ${num(row.months)}` },
    { key: 'gateway', label: t.admin.gateway, hideBelow: 'md', sort: (first, second) => first.gateway.localeCompare(second.gateway), text: (row) => row.gateway, cell: (row) => row.gateway },
    { key: 'amount', label: t.admin.amount, align: 'end', sort: (first, second) => Number(first.amount_bdt) - Number(second.amount_bdt), text: (row) => Number(row.amount_bdt), cell: (row) => <span className="numeral">৳{num(row.amount_bdt)}</span> },
    { key: 'trx', label: 'TrxID', hideBelow: 'lg', text: (row) => row.payer_ref || row.gateway_ref || '', cell: (row) => <span className="font-mono text-footnote">{row.payer_ref || row.gateway_ref || '—'}</span> },
    { key: 'status', label: t.admin.modeStatus, sort: (first, second) => first.status.localeCompare(second.status), text: (row) => row.status, cell: (row) => t.billing.status[row.status] },
    {
      key: 'actions',
      label: t.admin.actions,
      align: 'end',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          {row.status === 'review' && <Button size="sm" onClick={() => void decide(row, 'paid')}>{t.admin.approve}</Button>}
          {(row.status === 'review' || row.status === 'pending') && <Button size="sm" variant="outline" onClick={() => void decide(row, 'failed')}>{t.admin.reject}</Button>}
          {row.status === 'paid' && <Button size="sm" variant="ghost" onClick={() => void refund(row)}>{t.admin.refund}</Button>}
        </div>
      ),
    },
  ];
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={CreditCard} title={t.admin.paymentsTitle} lead={t.admin.paymentsLead} accent="river" className="mb-0" />
      <DataTable
        label={t.admin.paymentsTitle}
        rows={data?.items ?? []}
        columns={columns}
        rowKey={(row) => String(row.id)}
        exportName="payments"
        empty={<p className="text-center text-subhead text-muted-foreground">{t.admin.none}</p>}
        server={{ total: Number(data?.total ?? 0), page, perPage: Number(data?.per_page ?? 25), onPage: setPage, query, onQuery: setQuery, loading: busy, onPerPage: setPerPage }}
        filters={
          <Select aria-label={t.admin.modeStatus} value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="!h-10 !w-auto min-w-48 !rounded-full">
            <option value="">{t.admin.modeStatus}: {t.admin.all}</option>
            {STATUSES.map((item) => <option key={item} value={item}>{t.billing.status[item]}</option>)}
          </Select>
        }
      />
    </section>
  );
}
