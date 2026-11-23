// Super admin: payment gateways, plug and play. Each card is one gateway: its driver, names, what the payer reads, test or
// live, on or off, and its keys. Keys are write-only: the server says only whether each is set; typing replaces it. "Test
// connection" asks the gateway with the stored keys. Switching on is refused until every key (and, for manual, the account)
// is there. Adding a gateway: pick a driver and a slug.
import { Select } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Plus, ShieldKey, Wallet } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { GatewayAdmin, GatewayCheck, GatewayInput, GatewaySetup, PaymentDriver } from '@/lib/types';

type Draft = Omit<GatewayInput, 'secrets'> & { secrets: Record<string, string> };

function GatewayCard({ admin, gateway, onSaved }: { admin: Admin; gateway: GatewayAdmin; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>({ secrets: {} });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Draft, value: string | boolean) => setDraft((now) => ({ ...now, [key]: value }));
  const field = (key: 'name_en' | 'name_bn' | 'instructions_en' | 'instructions_bn' | 'account') => draft[key] ?? gateway[key];
  const save = async (extra: Partial<Draft> = {}) => {
    setBusy(true);
    try {
      await send(`/api/v1/admin/gateways/${gateway.slug}`, 'PATCH', { ...draft, ...extra }, admin.token);
      toast(t.admin.saved);
      setDraft({ secrets: {} });
      onSaved();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
    setBusy(false);
  };
  const check = async () => {
    try {
      const answer = await send<GatewayCheck>(`/api/v1/admin/gateways/${gateway.slug}/check`, 'POST', undefined, admin.token);
      toast(answer.message, answer.ok ? 'ok' : 'bad');
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const id = (name: string) => `gw-${gateway.slug}-${name}`;
  return (
    <article className="grid gap-4 rounded-3xl border bg-card p-5">
      <header className="flex flex-wrap items-center gap-3">
        <span className="pastel grid size-11 place-items-center [--tile:var(--tint-butter)]"><Wallet size={20} /></span>
        <div className="grid">
          <strong className="text-headline">{gateway.name_en || gateway.slug}</strong>
          <span className="text-caption text-muted-foreground">{gateway.slug} · {t.billing.drivers[gateway.driver]}</span>
        </div>
        <label className="ml-auto flex items-center gap-2 text-footnote">
          {t.admin.activeLabel}
          <Switch checked={gateway.active} onCheckedChange={(on) => void save({ active: on })} aria-label={`${gateway.slug}: ${t.admin.activeLabel}`} />
        </label>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label htmlFor={id('en')}>{t.admin.nameEn}</Label><Input id={id('en')} placeholder={t.ph.nameEn} value={field('name_en')} onChange={(event) => set('name_en', event.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor={id('bn')}>{t.admin.nameBn}</Label><Input id={id('bn')} placeholder={t.ph.nameBn} value={field('name_bn')} onChange={(event) => set('name_bn', event.target.value)} /></div>
        {gateway.driver === 'manual' && (
          <>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor={id('acc')}>{t.admin.payInto}</Label><Input id={id('acc')} placeholder={t.ph.account} value={field('account')} onChange={(event) => set('account', event.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor={id('ie')}>{t.admin.instructionsEn}</Label><textarea id={id('ie')} placeholder={t.ph.instructions} rows={3} value={field('instructions_en')} onChange={(event) => set('instructions_en', event.target.value)} className="field rounded-xl p-3 text-subhead" /></div>
            <div className="grid gap-1.5"><Label htmlFor={id('ib')}>{t.admin.instructionsBn}</Label><textarea id={id('ib')} placeholder={t.ph.instructions} rows={3} value={field('instructions_bn')} onChange={(event) => set('instructions_bn', event.target.value)} className="field rounded-xl p-3 text-subhead" /></div>
          </>
        )}
      </div>
      {Object.keys(gateway.secrets).length > 0 && (
        <fieldset className="grid gap-3 rounded-2xl bg-muted/60 p-4">
          <legend className="flex items-center gap-1.5 px-1 text-footnote font-semibold"><ShieldKey size={15} /> {t.admin.keys}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(gateway.secrets).map(([name, isSet]) => (
              <div key={name} className="grid gap-1.5">
                <Label htmlFor={id(name)}>{name}</Label>
                <Input id={id(name)} type="password" autoComplete="new-password" placeholder={isSet ? t.admin.keySet : t.admin.keyMissing} value={draft.secrets[name] ?? ''} onChange={(event) => setDraft((now) => ({ ...now, secrets: { ...now.secrets, [name]: event.target.value } }))} />
              </div>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-footnote">
          <Switch checked={draft.sandbox ?? gateway.sandbox} onCheckedChange={(on) => set('sandbox', on)} aria-label={`${gateway.slug}: ${t.admin.sandbox}`} />
          {t.admin.sandbox}
        </label>
        <span className="flex-1" />
        {gateway.driver !== 'manual' && <Button variant="outline" size="sm" onClick={() => void check()}>{t.admin.check}</Button>}
        <Button size="sm" state={busy ? 'busy' : 'idle'} onClick={() => void save()}>{t.admin.save}</Button>
      </div>
    </article>
  );
}

export function Gateways({ admin }: { admin: Admin }) {
  const { t } = useI18n();
  const [setup, setSetup] = useState<GatewaySetup | null>(null);
  const [driver, setDriver] = useState<PaymentDriver>('bkash');
  const [slug, setSlug] = useState('');
  const load = () => void send<GatewaySetup>('/api/v1/admin/gateways', 'GET', undefined, admin.token).then(setSetup).catch(() => setSetup(null));
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!setup) return null;
  const add = async () => {
    try {
      await send('/api/v1/admin/gateways', 'POST', { slug: slug.trim(), driver, name_en: t.billing.drivers[driver] }, admin.token);
      setSlug('');
      toast(t.admin.saved);
      load();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Wallet} title={t.admin.gatewaysTitle} lead={t.admin.gatewaysLead} accent="saffron" className="mb-0" />
      {!setup.vault_ready && <p role="alert" className="pastel p-3 text-footnote font-semibold [--tile:var(--tint-blush)]">{t.admin.vaultMissing}</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        {setup.gateways.map((gateway) => <GatewayCard key={gateway.slug} admin={admin} gateway={gateway} onSaved={load} />)}
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="gw-driver">{t.admin.driver}</Label>
          <Select id="gw-driver" value={driver} onChange={(event) => setDriver(event.target.value as PaymentDriver)} className="field h-11 rounded-xl px-3 text-subhead">
            {setup.drivers.map((item) => <option key={item.driver} value={item.driver}>{t.billing.drivers[item.driver]}</option>)}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gw-slug">{t.admin.slug}</Label>
          <Input id="gw-slug" value={slug} placeholder="bkash" onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="!w-48" />
        </div>
        <Button icon={Plus} disabled={!slug} onClick={() => void add()}>{t.admin.addGateway}</Button>
      </div>
      <p className="text-footnote text-muted-foreground">{t.admin.onlySuper}</p>
    </section>
  );
}
