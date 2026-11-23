// Plans: every tier and what it includes, straight from the tiers the super admin set (names, prices, limits). The
// signed-in account's tier is marked. A paid tier opens its checkout (months, gateway) right in its card; the gateways are
// the ones the super admin switched on, so the page changes with them and never needs a deploy.
import { lazy, Suspense, useState } from 'react';
import { Check, Crown } from '@/components/icons/page';
import { TierBones } from '@/components/kit/bones';
import { ErrorBox } from '@/components/kit/loaderror';
import { Button } from '@/components/ui/button';
import { endpoints, useResource } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isSwitch } from '@/lib/features';
import { useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import type { Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

const Checkout = lazy(() => import('@/components/billing/Checkout').then((module) => ({ default: module.Checkout })));

export default function Pricing() {
  const { t, lang, num } = useI18n();
  const { me } = useAuth();
  const { data, error } = useResource<Tier[]>(endpoints.tiers(lang));
  const [buying, setBuying] = useState('');
  const value = (feature: Tier['features'][number]) => {
    if (isSwitch(feature.feature)) return feature.value ? t.tiers.yes : t.tiers.no;
    return feature.value < 0 ? t.tiers.unlimited : num(feature.value);
  };
  return (
    <main className="page grid gap-8">
      <header className="mx-auto grid max-w-2xl gap-3 text-center">
        <h1 className="text-display">{t.tiers.title}</h1>
        <p className="text-callout text-muted-foreground">{t.tiers.lead}</p>
      </header>
      {error && <ErrorBox />}
      {!data && !error && <TierBones />}
      {data && (
        <div className="grid gap-5 md:grid-cols-3">
          {data.map((tier, position) => {
            const mine = me?.tier.slug === tier.slug;
            const featured = position === 1;
            return (
              <section key={tier.slug} className={cn('grid content-start gap-5 p-6', featured ? 'promo shadow-[0_24px_48px_-24px_var(--violet)] [&_.text-muted-foreground]:text-white/80 [&_.text-faint-foreground]:text-white/55 [&_svg.text-foreground]:text-white' : 'surface rounded-[28px]', mine && !featured && '!border-foreground')}>
                <div className="grid gap-1">
                  <p className="flex items-center gap-2 text-title-3 font-bold">
                    {featured && <Crown size={18} className="text-cta" />} {tier.name}
                    {mine && <span className="rounded-full bg-cta px-2 py-0.5 text-caption text-cta-ink">{t.tiers.current}</span>}
                  </p>
                  <p className="text-subhead text-muted-foreground">{tier.summary}</p>
                </div>
                <p className="flex items-baseline gap-1">
                  {tier.price_bdt === null ? <span className="numeral text-[36px]">{tier.is_default ? t.tiers.free : '—'}</span> : (
                    <>
                      <span className="numeral text-[36px]">৳{num(tier.price_bdt)}</span>
                      <span className="text-subhead text-muted-foreground">/ {t.tiers.month}</span>
                    </>
                  )}
                </p>
                <ul className="grid gap-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature.feature} className="flex items-start justify-between gap-3 text-subhead">
                      <span className="flex items-start gap-2">
                        <Check size={16} className={cn('mt-0.5 shrink-0', feature.value === 0 ? 'text-faint-foreground' : 'text-foreground')} /> {t.tiers.features[feature.feature]}
                      </span>
                      <strong className={cn('shrink-0 tabular-nums', feature.value === 0 && 'font-normal text-faint-foreground')}>{value(feature)}</strong>
                    </li>
                  ))}
                </ul>
                {!me && tier.is_default && <Button onClick={() => navigate('/register')}>{t.auth.signUp}</Button>}
                {!me && !tier.is_default && tier.price_bdt !== null && (
                  <Button variant="outline" onClick={() => navigate(`/login?next=${encodeURIComponent('/pricing')}`)}>{t.billing.signIn}</Button>
                )}
                {me && !tier.is_default && tier.price_bdt !== null && buying !== tier.slug && (
                  <Button onClick={() => setBuying(tier.slug)}>{mine ? t.billing.renew : t.tiers.upgrade}</Button>
                )}
                {me && buying === tier.slug && (
                  <Suspense fallback={null}>
                    <Checkout tier={tier} />
                  </Suspense>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
