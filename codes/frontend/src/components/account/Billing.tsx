// My account → plan and payments: the plan and the day it ends, a way to renew or change, and every payment with its status.
// Coming back from a gateway (?billing=paid|failed|cancelled|pending|review) shows the result once, refreshes the plan, and
// clears the address.
import { useEffect, useState } from 'react';
import { Crown, Wallet } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { send } from '@/lib/api';
import { refreshMe } from '@/lib/auth';
import { digits, useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import type { Me, Payment, PaymentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const TILE: Record<PaymentStatus, string> = {
  pending: 'var(--tint-sky)',
  review: 'var(--tint-butter)',
  paid: 'var(--tint-mint)',
  failed: 'var(--tint-blush)',
  cancelled: 'var(--tint-lilac)',
  refunded: 'var(--tint-lilac)',
};
const RESULTS = ['paid', 'failed', 'cancelled', 'pending'] as const;
type Result = (typeof RESULTS)[number];

function returned(): Result | 'review' | null {
  const word = new URLSearchParams(window.location.search).get('billing');
  if (word === 'review') return 'review';
  return RESULTS.find((item) => item === word) ?? null;
}

export function Billing({ me }: { me: Me }) {
  const { t, lang, num } = useI18n();
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [result] = useState(returned);
  useEffect(() => {
    void send<Payment[]>(`/api/v1/me/payments?lang=${lang}`, 'GET').then(setRows).catch(() => setRows([]));
  }, [lang]);
  useEffect(() => {
    if (!result) return;
    void refreshMe();
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [result]);
  const message = result === 'review' ? t.billing.submitted : result ? t.billing.result[result] : '';
  return (
    <section className="grid gap-4" aria-labelledby="billing-title">
      <h2 id="billing-title" className="flex items-center gap-2 text-headline"><Wallet size={18} /> {t.billing.title}</h2>
      {message && (
        <p role="status" className={cn('pastel p-4 text-subhead font-semibold', result === 'paid' ? '[--tile:var(--tint-mint)]' : result === 'failed' ? '[--tile:var(--tint-blush)]' : '[--tile:var(--tint-butter)]')}>
          {message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="pastel grid content-between gap-6 p-5 [--tile:var(--tint-lilac)]">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider opacity-70"><Crown size={14} /> {t.tiers.current}</p>
            <p className="text-title-1 font-extrabold tracking-tight">{me.tier.name}</p>
            {me.tier_expires_on && <p className="text-subhead opacity-80">{t.billing.until.replace('{day}', digits(me.tier_expires_on, lang))}</p>}
          </div>
          <Button onClick={() => navigate('/pricing')} className="w-fit">{t.billing.renew}</Button>
        </div>
        <div className="surface grid content-start gap-2 rounded-3xl p-4 sm:p-5">
          <p className="text-footnote font-semibold text-muted-foreground">{t.billing.history}</p>
          {rows?.length === 0 && <p className="py-4 text-subhead text-muted-foreground">{t.billing.none}</p>}
          <ul className="grid gap-2">
            {rows?.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-subhead">
                <strong>{row.tier_name}</strong>
                <span className="text-muted-foreground">{num(row.months)} {t.billing.months} · {row.gateway}</span>
                <span className="numeral ml-auto">৳{num(row.amount_bdt)}</span>
                <span className="rounded-full px-2.5 py-0.5 text-caption font-semibold text-[var(--tint-ink)]" style={{ background: TILE[row.status] }}>
                  {t.billing.status[row.status]}
                </span>
                {row.paid_on && <span className="w-full text-caption text-muted-foreground">{digits(row.paid_on, lang)}{row.payer_ref ? ` · ${row.payer_ref}` : ''}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
