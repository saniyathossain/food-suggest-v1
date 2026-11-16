// Admin: tiers as a matrix (features down, tiers across). Counts take a number (-1 = unlimited); switches toggle. Price
// per month. Saving a tier changes what every account on it gets at once (the API enforces it). Super admin only.
import { useEffect, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Crown } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { FeatureKey, Tier } from '@/lib/types';

const SWITCHES: FeatureKey[] = ['diet_modes', 'medicines', 'history', 'reports'];

export function TiersEditor({ admin, tiers, onSaved }: { admin: Admin; tiers: Tier[]; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Tier[]>(tiers);
  useEffect(() => {
    setDraft(tiers);
  }, [tiers]);
  const features = draft[0]?.features.map((item) => item.feature) ?? [];
  const set = (slug: string, feature: FeatureKey, value: number) =>
    setDraft((now) => now.map((tier) => (tier.slug === slug ? { ...tier, features: tier.features.map((item) => (item.feature === feature ? { ...item, value } : item)) } : tier)));
  const setPrice = (slug: string, price: string) => setDraft((now) => now.map((tier) => (tier.slug === slug ? { ...tier, price_bdt: price.trim() === '' ? null : Number(price) } : tier)));
  const save = async (tier: Tier) => {
    try {
      await send(`/api/v1/admin/tiers/${tier.slug}`, 'PATCH', { price_bdt: tier.price_bdt, features: tier.features }, admin.token);
      toast(t.admin.saved);
      onSaved();
    } catch (error) {
      toast(refusalText(error));
    }
  };
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Crown} title={t.admin.tiersTitle} lead={t.admin.tiersLead} accent="saffron" className="mb-0" />
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[640px] text-left text-subhead">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-3" />
              {draft.map((tier) => <th key={tier.slug} className="py-2 pr-3 text-headline">{tier.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2.5 pr-3 text-muted-foreground">{t.admin.price}</td>
              {draft.map((tier) => (
                <td key={tier.slug} className="py-2.5 pr-3">
                  <Input aria-label={`${tier.name}: ${t.admin.price}`} inputMode="numeric" placeholder={t.ph.price} value={tier.price_bdt ?? ''} onChange={(event) => setPrice(tier.slug, event.target.value.replace(/\D/g, ''))} className="!h-9 !w-28" />
                </td>
              ))}
            </tr>
            {features.map((feature) => (
              <tr key={feature} className="border-b last:border-0">
                <td className="py-2.5 pr-3 text-muted-foreground">{t.tiers.features[feature]}</td>
                {draft.map((tier) => {
                  const value = tier.features.find((item) => item.feature === feature)?.value ?? 0;
                  return (
                    <td key={tier.slug} className="py-2.5 pr-3">
                      {SWITCHES.includes(feature) ? (
                        <Switch checked={value === 1} onCheckedChange={(on) => set(tier.slug, feature, on ? 1 : 0)} aria-label={`${tier.name}: ${t.tiers.features[feature]}`} />
                      ) : (
                        <Input aria-label={`${tier.name}: ${t.tiers.features[feature]}`} inputMode="numeric" placeholder="0" value={value} onChange={(event) => set(tier.slug, feature, Number(event.target.value.replace(/[^\d-]/g, '') || 0))} className="!h-9 !w-24" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td />
              {draft.map((tier) => (
                <td key={tier.slug} className="pt-3 pr-3">
                  <Button size="sm" onClick={() => void save(tier)}>{t.admin.saveTier}</Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-footnote text-muted-foreground">{t.admin.onlySuper}</p>
    </section>
  );
}
