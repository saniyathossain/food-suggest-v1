// Super admin: the add / edit dialog of an external sync source. Every setting of the source is here: the platform it comes from (a preset
// that fills the rest), where to fetch (URL, method, query, body, custom headers with write-only secrets), how hard to try (timeout,
// retries, backoff, jitter), what a run does (update or append) and when (by hand or every N hours). "Test" sends one request with what is
// typed, with no retries, and saves nothing; for PUT, PATCH and DELETE it sends the real request, so it asks first.
import { useState } from 'react';
import { SyncHeaders } from '@/components/admin/SyncHeaders';
import { blank, fromSource, isWrite, KINDS, METHODS, MODES, toInput, withPlatform, type Draft } from '@/components/admin/syncDraft';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { toast } from '@/components/kit/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import type { SyncKind, SyncMethod, SyncMode, SyncPlatform, SyncSource, SyncTest } from '@/lib/types';

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string | undefined; children: React.ReactNode }) {
  return <div className="grid content-start gap-1.5"><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="text-caption text-muted-foreground">{hint}</p>}</div>;
}

type Props = { admin: Admin; source: SyncSource | 'new' | null; platforms: SyncPlatform[]; vaultReady: boolean; onClose: () => void; onSaved: () => void };

export function SyncForm({ admin, source, platforms, vaultReady, onClose, onSaved }: Props) {
  const { t, num, lang } = useI18n();
  const copy = t.admin.syncSources;
  const fresh = source === 'new';
  const [draft, setDraft] = useState<Draft>(() => (source && source !== 'new' ? fromSource(source) : blank()));
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SyncTest | null>(null);
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft((now) => ({ ...now, [key]: value }));
  const slug = fresh ? draft.slug.trim() : source?.slug ?? '';
  const preset = platforms.find((item) => item.slug === draft.platform);
  const pickPlatform = (value: string) => {
    const chosen = platforms.find((item) => item.slug === value);
    if (!chosen) return set('platform', '');
    setDraft((now) => withPlatform(now, chosen, fresh));
    setResult(null);
    toast(copy.platformFilled.replace('{name}', chosen.name));
  };
  const test = async () => {
    const write = isWrite(draft.method);
    if (write && !(await confirmDialog({ title: copy.writeTitle.replace('{method}', draft.method.toUpperCase()), body: copy.writeBody.replace('{method}', draft.method.toUpperCase()).replace('{url}', draft.base_url.trim()), action: copy.writeAction, tone: 'danger' }))) return;
    setTesting(true);
    setResult(null);
    try {
      setResult(await send<SyncTest>('/api/v1/admin/sync-sources/test', 'POST', { ...toInput(draft, true), slug: slug || undefined, ...(write ? { confirm_write: true } : {}) }, admin.token));
      onSaved();
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
  const number = (name: 'timeout_ms' | 'max_retries' | 'backoff_base_ms' | 'backoff_factor' | 'backoff_max_ms', label: string, holder: string) => (
    <Field id={id(name)} label={label}><Input id={id(name)} type="number" inputMode="decimal" min={0} placeholder={holder} value={draft[name]} onChange={(event) => set(name, event.target.value)} /></Field>
  );
  return (
    <Dialog open={source !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>{fresh ? copy.add : copy.edit}</DialogTitle>
          <DialogDescription>{copy.lead}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field id={id('platform')} label={copy.platform} hint={copy.platformHelp}>
            <Select id={id('platform')} value={draft.platform} onChange={(event) => pickPlatform(event.target.value)}>
              <option value="">{copy.platformNone}</option>
              {platforms.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </Select>
            {preset && <p className="text-caption text-muted-foreground">{preset.note[lang] || preset.note.en} <a href={preset.docs_url} target="_blank" rel="noreferrer noopener" className="font-semibold text-primary underline-offset-2 hover:underline">{copy.platformDocs}</a></p>}
          </Field>
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <Field id={id('name')} label={copy.name}><Input id={id('name')} placeholder={copy.ph.name} value={draft.name} onChange={(event) => set('name', event.target.value)} /></Field>
            <Field id={id('slug')} label={copy.slug} hint={fresh ? copy.slugHint : undefined}><Input id={id('slug')} placeholder={copy.ph.slug} value={fresh ? draft.slug : slug} disabled={!fresh} onChange={(event) => set('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /></Field>
            <Field id={id('kind')} label={copy.kind} hint={draft.kind !== 'medicines' ? copy.noMapper : undefined}>
              <Select id={id('kind')} value={draft.kind} onChange={(event) => set('kind', event.target.value as SyncKind)}>{KINDS.map((kind) => <option key={kind} value={kind}>{copy.kinds[kind]}</option>)}</Select>
            </Field>
            <Field id={id('method')} label={copy.method} hint={isWrite(draft.method) ? copy.writeNote : undefined}>
              <Select id={id('method')} value={draft.method} onChange={(event) => set('method', event.target.value as SyncMethod)}>{METHODS.map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}</Select>
            </Field>
          </div>
          <Field id={id('url')} label={copy.url}><Input id={id('url')} type="url" placeholder={copy.ph.url} value={draft.base_url} onChange={(event) => set('base_url', event.target.value)} /></Field>
          <Field id={id('query')} label={copy.query} hint={copy.queryHelp}><Input id={id('query')} className="font-mono text-footnote" placeholder={copy.ph.query} value={draft.query_template} onChange={(event) => set('query_template', event.target.value)} /></Field>
          {draft.method !== 'get' && (
            <Field id={id('body')} label={copy.body} hint={copy.bodyHelp}><textarea id={id('body')} rows={4} placeholder={copy.ph.body} value={draft.body} onChange={(event) => set('body', event.target.value)} className="field rounded-xl p-3 font-mono text-footnote" /></Field>
          )}
          <SyncHeaders headers={draft.headers} vaultReady={vaultReady} onChange={(headers) => set('headers', headers)} />
          <fieldset className="grid content-start gap-3 rounded-2xl bg-muted/60 p-4">
            <div className="grid items-start gap-3 sm:grid-cols-2">{number('timeout_ms', copy.timeout, copy.ph.timeout)}{number('max_retries', copy.retries, copy.ph.retries)}{number('backoff_base_ms', copy.backoffBase, copy.ph.backoffBase)}{number('backoff_factor', copy.backoffFactor, copy.ph.backoffFactor)}{number('backoff_max_ms', copy.backoffMax, copy.ph.backoffMax)}</div>
            <label className="flex items-center gap-2 text-subhead"><Switch checked={draft.jitter} onCheckedChange={(on) => set('jitter', on)} aria-label={copy.jitter} />{copy.jitter}</label>
            <p className="text-caption text-muted-foreground">{copy.retryHelp}</p>
          </fieldset>
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <Field id={id('mode')} label={copy.mode} hint={copy.modeHelp}>
              <Select id={id('mode')} value={draft.mode} onChange={(event) => set('mode', event.target.value as SyncMode)}>{MODES.map((mode) => <option key={mode} value={mode}>{copy.modes[mode]}</option>)}</Select>
            </Field>
            <div className="grid content-start gap-3">
              <Field id={id('schedule')} label={copy.schedule}>
                <Select id={id('schedule')} value={draft.every ? 'every' : 'manual'} onChange={(event) => set('every', event.target.value === 'every')}><option value="manual">{copy.manual}</option><option value="every">{copy.every}</option></Select>
              </Field>
              {draft.every && <Field id={id('hours')} label={copy.hours}><Input id={id('hours')} type="number" min={1} max={8760} placeholder={copy.ph.hours} value={draft.hours} onChange={(event) => set('hours', event.target.value)} className="!w-32" /></Field>}
            </div>
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
