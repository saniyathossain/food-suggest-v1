// Checkout for one paid tier: how many months, which gateway (only the ones the super admin switched on), the total, then
// either the gateway's own page (bKash, SSLCommerz) or, for a manual transfer, where to send the money and a box for the
// TrxID. The server prices it and checks the result with the gateway; this page only asks.
import { useState } from 'react';
import { refreshMe } from '@/lib/auth';
import { CreditCard, ShieldKey, Wallet } from '@/components/icons/page';
import { toast } from '@/components/kit/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, endpoints, send, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import type { Checkout as CheckoutResult, Gateway, Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

const LENGTHS = [1, 3, 6, 12] as const;
const TINTS = ['var(--tint-sky)', 'var(--tint-butter)', 'var(--tint-mint)', 'var(--tint-blush)'];

function problem(error: unknown): string {
  if (error instanceof ApiError) return Object.values(error.fields)[0] ?? error.message;
  return String(error);
}

export function Checkout({ tier }: { tier: Tier }) {
  const { t, lang, num } = useI18n();
  const { data: gateways } = useResource<Gateway[]>(endpoints.gateways(lang));
  const [months, setMonths] = useState<number>(1);
  const [chosen, setChosen] = useState('');
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState<CheckoutResult | null>(null);
  const [reference, setReference] = useState('');
  const gateway = gateways?.find((item) => item.slug === chosen) ?? gateways?.[0];
  const total = (tier.price_bdt ?? 0) * months;
  const pay = async () => {
    if (!gateway) return;
    setBusy(true);
    try {
      const result = await send<CheckoutResult>(`/api/v1/me/checkout?lang=${lang}`, 'POST', { tier: tier.slug, gateway: gateway.slug, months });
      if (result.redirect_url) {
        toast(t.billing.redirecting);
        window.location.assign(result.redirect_url);
        return;
      }
      setManual(result);
    } catch (error) {
      toast(problem(error), 'bad');
    }
    setBusy(false);
  };
  const submit = async () => {
    if (!manual) return;
    setBusy(true);
    try {
      await send(`/api/v1/me/payments/${manual.payment_id}/reference`, 'POST', { reference: reference.trim() });
      toast(t.billing.submitted);
      await refreshMe();
      navigate('/account?billing=review');
    } catch (error) {
      toast(problem(error), 'bad');
    }
    setBusy(false);
  };
  if (gateways && gateways.length === 0) return <p className="rounded-2xl bg-muted p-4 text-footnote text-muted-foreground">{t.billing.noMethods}</p>;
  if (manual) {
    return (
      <div className="grid gap-4 rounded-3xl bg-[var(--tint-butter)] p-5 text-[var(--tint-ink)]">
        <p className="flex items-center gap-2 text-headline"><Wallet size={20} /> {t.billing.manualTitle}</p>
        <p className="text-subhead">{manual.gateway.instructions}</p>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/70 p-3 dark:bg-black/20">
            <dt className="text-caption opacity-70">{t.billing.sendTo}</dt>
            <dd className="numeral text-title-3 select-all">{manual.gateway.account}</dd>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 dark:bg-black/20">
            <dt className="text-caption opacity-70">{t.billing.amount}</dt>
            <dd className="numeral text-title-3">৳{num(manual.amount_bdt)}</dd>
          </div>
        </dl>
        <div className="grid gap-2">
          <Label htmlFor={`trx-${tier.slug}`}>{t.billing.reference}</Label>
          <Input id={`trx-${tier.slug}`} value={reference} placeholder={t.ph.trx} autoComplete="off" spellCheck={false} onChange={(event) => setReference(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} className="bg-card font-mono tracking-wider" />
        </div>
        <Button state={busy ? 'busy' : 'idle'} disabled={reference.length < 6} onClick={() => void submit()} className="w-full">
          {t.billing.submit}
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-footnote font-semibold text-muted-foreground">{t.billing.length}</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t.billing.length}>
          {LENGTHS.map((length, position) => (
            <button
              key={length}
              type="button"
              aria-pressed={months === length}
              onClick={() => setMonths(length)}
              style={{ ['--pick' as string]: TINTS[position] }}
              className="press grid cursor-pointer gap-0.5 rounded-2xl bg-[var(--pick)] px-2 py-2.5 text-center text-[var(--tint-ink)] outline-offset-2 transition-shadow aria-pressed:ring-2 aria-pressed:ring-foreground"
            >
              <span className="numeral text-title-3">{num(length)}</span>
              <span className="text-caption opacity-75">{t.billing.months}</span>
            </button>
          ))}
        </div>
      </div>
      {gateways && gateways.length > 1 && (
        <div className="grid gap-2">
          <p className="text-footnote font-semibold text-muted-foreground">{t.billing.method}</p>
          <div className="grid gap-2" role="radiogroup" aria-label={t.billing.method}>
            {gateways.map((item) => (
              <button key={item.slug} type="button" role="radio" aria-checked={gateway?.slug === item.slug} onClick={() => setChosen(item.slug)} className={cn('press flex cursor-pointer items-center gap-3 rounded-2xl border bg-card px-3.5 py-2.5 text-left text-subhead transition-colors', gateway?.slug === item.slug && 'border-foreground')}>
                <span className="grid size-9 place-items-center rounded-full bg-accent">{item.driver === 'sslcommerz' ? <CreditCard size={18} /> : <Wallet size={18} />}</span>
                <span className="grid">
                  <strong>{item.name}</strong>
                  <span className="text-caption text-muted-foreground">{t.billing.drivers[item.driver]}</span>
                </span>
                {item.sandbox && <span className="ml-auto rounded-full bg-[var(--tint-lilac)] px-2 py-0.5 text-caption text-[var(--tint-ink)]">{t.billing.sandbox}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button icon={ShieldKey} state={busy ? 'busy' : 'idle'} disabled={!gateway || total <= 0} onClick={() => void pay()} className="w-full">
        {t.billing.pay.replace('{amount}', num(total))}
      </Button>
      <p className="text-caption text-muted-foreground">{gateway?.driver === 'manual' ? gateway.instructions : t.billing.secure}</p>
    </div>
  );
}
