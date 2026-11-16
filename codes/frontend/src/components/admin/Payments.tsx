// Admin: payments, newest first, 25 a page. Filter by status and gateway, search by email, payment id or TrxID. Manual
// transfers waiting for review get Approve (the account moves to the tier) and Reject; a paid one can be marked refunded
// (the money goes back through the gateway's own panel; switch the tier in Accounts if needed).
import { useEffect, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { CreditCard } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Page, PaymentAdmin, PaymentStatus } from '@/lib/types';

const STATUSES: PaymentStatus[] = ['review', 'pending', 'paid', 'failed', 'cancelled', 'refunded'];

export function Payments({ admin }: { admin: Admin }) {
  const { t, num, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<PaymentAdmin> | null>(null);
  const load = () => {
    const params = new URLSearchParams({ page: String(page), ...(query.trim() ? { q: query.trim() } : {}), ...(status ? { status } : {}) });
    void send<Page<PaymentAdmin>>(`/api/v1/admin/payments?${params}`, 'GET', undefined, admin.token).then(setData).catch(() => undefined);
  };
  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [query, status, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = async (row: PaymentAdmin, next: PaymentStatus) => {
    try {
      await send(`/api/v1/admin/payments/${row.id}`, 'PATCH', { status: next }, admin.token);
      toast(t.admin.saved);
      load();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const pages = data ? Math.max(1, Math.ceil(Number(data.total) / Number(data.per_page))) : 1;
  const when = (seconds: number) => new Date(seconds * 1000).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={CreditCard} title={t.admin.paymentsTitle} lead={t.admin.paymentsLead} accent="river" className="mb-0" />
      <div className="flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder={t.admin.searchPayments} aria-label={t.admin.searchPayments} className="max-w-xs" />
        <select aria-label={t.admin.modeStatus} value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="field h-11 rounded-xl px-3 text-subhead">
          <option value="">{t.admin.modeStatus}: {t.admin.all}</option>
          {STATUSES.map((item) => <option key={item} value={item}>{t.billing.status[item]}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[860px] text-left text-subhead">
          <thead className="text-footnote text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-semibold">{t.auth.email}</th>
              <th className="py-2 pr-3 font-semibold">{t.admin.tier}</th>
              <th className="py-2 pr-3 font-semibold">{t.admin.gateway}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t.admin.amount}</th>
              <th className="py-2 pr-3 font-semibold">TrxID</th>
              <th className="py-2 pr-3 font-semibold">{t.admin.modeStatus}</th>
              <th className="py-2 text-right font-semibold">{t.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id} className="border-b align-top last:border-0">
                <td className="py-3 pr-3">
                  <strong className="block">{row.email || '—'}</strong>
                  <span className="text-caption text-muted-foreground">{when(Number(row.created_at))} · {row.id}</span>
                </td>
                <td className="py-3 pr-3">{row.tier} × {num(row.months)}</td>
                <td className="py-3 pr-3">{row.gateway}</td>
                <td className="numeral py-3 pr-3 text-right">৳{num(row.amount_bdt)}</td>
                <td className="py-3 pr-3 font-mono text-footnote">{row.payer_ref || row.gateway_ref || '—'}</td>
                <td className="py-3 pr-3">{t.billing.status[row.status]}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {row.status === 'review' && <Button size="sm" onClick={() => void decide(row, 'paid')}>{t.admin.approve}</Button>}
                    {(row.status === 'review' || row.status === 'pending') && <Button size="sm" variant="outline" onClick={() => void decide(row, 'failed')}>{t.admin.reject}</Button>}
                    {row.status === 'paid' && <Button size="sm" variant="ghost" onClick={() => window.confirm(t.admin.refund) && void decide(row, 'refunded')}>{t.admin.refund}</Button>}
                  </div>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">{t.admin.none}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-footnote text-muted-foreground">
        <span>{t.admin.pageOf.replace('{n}', num(page + 1)).replace('{m}', num(pages))}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{t.admin.previous}</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t.admin.next}</Button>
        </div>
      </div>
    </section>
  );
}
