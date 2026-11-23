// Super admin: the add / edit dialog of an external sync source. Every setting of the source is here: where to fetch (URL, method,
// query, headers with write-only secrets), how hard to try (timeout, retries, backoff, jitter), and when (by hand or every N hours).
// "Test" sends one request with what is typed, with no retries, and saves nothing.
import { useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { toast } from '@/components/kit/toast';
import { Plus, Trash } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { SyncKind, SyncMethod, SyncSource, SyncSourceInput, SyncTest } from '@/lib/types';

const KINDS: SyncKind[] = ['medicines', 'foods', 'conditions', 'allergies', 'custom'];
const METHODS: SyncMethod[] = ['get', 'post'];
type Header = { name: string; value: string; secret: boolean };
type Draft = { slug: string; name: string; kind: SyncKind; base_url: string; method: SyncMethod; query_template: string; headers: Header[]; timeout_ms: string; max_retries: string; backoff_base_ms: string; backoff_factor: string; backoff_max_ms: string; jitter: boolean; every: boolean; hours: string; active: boolean };

const blank = (): Draft => ({ slug: '', name: '', kind: 'medicines', base_url: '', method: 'get', query_template: '', headers: [], timeout_ms: '15000', max_retries: '3', backoff_base_ms: '500', backoff_factor: '2', backoff_max_ms: '30000', jitter: true, every: false, hours: '24', active: false });
const fromSource = (source: SyncSource): Draft => ({ ...blank(), slug: source.slug, name: source.name, kind: source.kind, base_url: source.base_url, method: source.method, query_template: source.query_template, headers: source.headers.map(({ name, value, secret }) => ({ name, value, secret })), timeout_ms: String(source.timeout_ms), max_retries: String(source.max_retries), backoff_base_ms: String(source.backoff_base_ms), backoff_factor: String(source.backoff_factor), backoff_max_ms: String(source.backoff_max_ms), jitter: source.jitter, every: source.schedule_hours !== null, hours: String(source.schedule_hours ?? 24), active: source.active });
const toInput = (draft: Draft, fresh: boolean): SyncSourceInput => ({
  ...(fresh ? { slug: draft.slug.trim() } : {}),
  name: draft.name.trim(), kind: draft.kind, base_url: draft.base_url.trim(), method: draft.method, query_template: draft.query_template,
  headers: draft.headers.filter((header) => header.name.trim()).map((header) => ({ ...header, name: header.name.trim() })),
  timeout_ms: Number(draft.timeout_ms), max_retries: Number(draft.max_retries), backoff_base_ms: Number(draft.backoff_base_ms), backoff_factor: Number(draft.backoff_factor), backoff_max_ms: Number(draft.backoff_max_ms),
  jitter: draft.jitter, schedule_hours: draft.every ? Number(draft.hours) : null, active: draft.active,
});

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string | undefined; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="text-caption text-muted-foreground">{hint}</p>}</div>;
}

type Props = { admin: Admin; source: SyncSource | 'new' | null; vaultReady: boolean; onClose: () => void; onSaved: () => void };

export function SyncForm({ admin, source, vaultReady, onClose, onSaved }: Props) {
  const { t, num } = useI18n();
  const copy = t.admin.syncSources;
  const fresh = source === 'new';
  const [draft, setDraft] = useState<Draft>(() => (source && source !== 'new' ? fromSource(source) : blank()));
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SyncTest | null>(null);
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft((now) => ({ ...now, [key]: value }));
  const setHeader = (at: number, change: Partial<Header>) => set('headers', draft.headers.map((header, index) => (index === at ? { ...header, ...change } : header)));
  const slug = fresh ? draft.slug.trim() : source?.slug ?? '';
  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      setResult(await send<SyncTest>('/api/v1/admin/sync-sources/test', 'POST', { ...toInput(draft, true), slug: slug || undefined }, admin.token));
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
    setTesting(false);
  };
  const save = async () => {
    setBusy(true);
    try {
      await send(fresh ? '/api/v1/admin/sync-sources' : `/api/v1/admin/sync-sources/${slug}`, fresh ? 'POST' : 'PATCH', toInput(draft, fresh), admin.token);
      toast(t.admin.saved);
      onSaved();
      onClose();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
    setBusy(false);
  };
  const id = (name: string) => `sync-${name}`;
  const number = (name: keyof Draft, label: string) => <Field id={id(name)} label={label}><Input id={id(name)} type="number" inputMode="decimal" min={0} value={String(draft[name])} onChange={(event) => set(name, event.target.value as never)} /></Field>;
  return (
    <Dialog open={source !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>{fresh ? copy.add : copy.edit}</DialogTitle>
          <DialogDescription>{copy.lead}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={id('name')} label={copy.name}><Input id={id('name')} value={draft.name} onChange={(event) => set('name', event.target.value)} /></Field>
            <Field id={id('slug')} label={copy.slug} hint={fresh ? copy.slugHint : undefined}><Input id={id('slug')} value={fresh ? draft.slug : slug} disabled={!fresh} onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /></Field>
          </div>
          <Field id={id('kind')} label={copy.kind} hint={draft.kind !== 'medicines' ? copy.noMapper : undefined}>
            <Select id={id('kind')} value={draft.kind} onChange={(event) => set('kind', event.target.value as SyncKind)}>{KINDS.map((kind) => <option key={kind} value={kind}>{copy.kinds[kind]}</option>)}</Select>
          </Field>
          <Field id={id('method')} label={copy.method}>
            <Select id={id('method')} value={draft.method} onChange={(event) => set('method', event.target.value as SyncMethod)}>{METHODS.map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}</Select>
          </Field>
          <Field id={id('url')} label={copy.url}><Input id={id('url')} type="url" placeholder="https://api.fda.gov/drug/label.json" value={draft.base_url} onChange={(event) => set('base_url', event.target.value)} /></Field>
          <Field id={id('query')} label={copy.query} hint={copy.queryHelp}><Input id={id('query')} className="font-mono text-footnote" placeholder="limit=100" value={draft.query_template} onChange={(event) => set('query_template', event.target.value)} /></Field>
          <fieldset className="grid gap-3 rounded-2xl bg-muted/60 p-4">
            <legend className="px-1 text-footnote font-semibold">{copy.headers}</legend>
            {!vaultReady && <p role="alert" className="text-footnote font-semibold text-avoid-ink">{copy.vaultMissing}</p>}
            {draft.headers.map((header, at) => (
              <div key={at} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 max-sm:grid-cols-[1fr_auto_auto]">
                <Input aria-label={copy.headerName} placeholder={copy.headerName} value={header.name} onChange={(event) => setHeader(at, { name: event.target.value })} />
                <Input aria-label={copy.headerValue} className="max-sm:col-span-3 max-sm:order-last" type={header.secret ? 'password' : 'text'} autoComplete="new-password" placeholder={header.secret ? copy.secretSet : copy.headerValue} value={header.value} onChange={(event) => setHeader(at, { value: event.target.value })} />
                <label className="flex items-center gap-2 text-footnote"><Switch checked={header.secret} onCheckedChange={(on) => setHeader(at, { secret: on })} aria-label={`${header.name}: ${copy.secret}`} />{copy.secret}</label>
                <IconButton icon={Trash} label={copy.removeHeader} tone="danger" onClick={() => set('headers', draft.headers.filter((_, index) => index !== at))} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" icon={Plus} className="w-fit" onClick={() => set('headers', [...draft.headers, { name: '', value: '', secret: false }])}>{copy.addHeader}</Button>
          </fieldset>
          <fieldset className="grid gap-3 rounded-2xl bg-muted/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">{number('timeout_ms', copy.timeout)}{number('max_retries', copy.retries)}{number('backoff_base_ms', copy.backoffBase)}{number('backoff_factor', copy.backoffFactor)}{number('backoff_max_ms', copy.backoffMax)}</div>
            <label className="flex items-center gap-2 text-subhead"><Switch checked={draft.jitter} onCheckedChange={(on) => set('jitter', on)} aria-label={copy.jitter} />{copy.jitter}</label>
            <p className="text-caption text-muted-foreground">{copy.retryHelp}</p>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <Field id={id('schedule')} label={copy.schedule}>
              <Select id={id('schedule')} value={draft.every ? 'every' : 'manual'} onChange={(event) => set('every', event.target.value === 'every')}><option value="manual">{copy.manual}</option><option value="every">{copy.every}</option></Select>
            </Field>
            {draft.every && <Field id={id('hours')} label={copy.hours}><Input id={id('hours')} type="number" min={1} max={8760} value={draft.hours} onChange={(event) => set('hours', event.target.value)} className="!w-32" /></Field>}
          </div>
          <label className="flex items-center gap-2 text-subhead"><Switch checked={draft.active} onCheckedChange={(on) => set('active', on)} aria-label={copy.active} />{copy.active}<span className="text-caption text-muted-foreground">{copy.activeHelp}</span></label>
          {result && (
            <div role="status" className={`rounded-2xl border p-4 text-subhead ${result.ok ? '' : 'border-[var(--avoid)]'}`}>
              <p className={result.ok ? 'font-semibold' : 'font-semibold text-avoid-ink'}>
                {result.ok ? (result.can_save ? copy.testOk : copy.testOkRaw).replace('{n}', num(result.rows_seen)).replace('{ms}', num(result.elapsed_ms)).replace('{m}', num(result.rows_usable)) : copy.testFailed.replace('{why}', result.error ?? '')}
              </p>
              {result.sample.length > 0 && <ul className="mt-2 grid gap-1 font-mono text-caption text-muted-foreground">{result.sample.map((line, at) => <li key={at} className="truncate">{line}</li>)}</ul>}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" state={testing ? 'busy' : 'idle'} disabled={!draft.base_url.trim()} onClick={() => void test()}>{testing ? copy.testing : copy.test}</Button>
            <Button type="button" state={busy ? 'busy' : 'idle'} onClick={() => void save()}>{copy.save}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
