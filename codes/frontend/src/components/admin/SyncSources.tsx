// Super admin: external sync sources. A table of sources (search, sort, per page, filters by kind and last result), a run button and an
// on/off switch on each row, an add / edit dialog (SyncForm) with a Test button, and the run history under it (SyncRuns). Delete asks first.
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { SyncForm } from '@/components/admin/SyncForm';
import { SyncRuns } from '@/components/admin/SyncRuns';
import { StatusBadge, useWhen } from '@/components/admin/syncParts';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Pencil, Play, Plus, Repeat, Trash } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import type { SyncKind, SyncRun, SyncSetup, SyncSource } from '@/lib/types';

const KINDS: SyncKind[] = ['medicines', 'foods', 'conditions', 'allergies', 'custom'];

export function SyncSources({ admin }: { admin: Admin }) {
  const { t, num } = useI18n();
  const copy = t.admin.syncSources;
  const when = useWhen();
  const [setup, setSetup] = useState<SyncSetup | null>(null);
  const [editing, setEditing] = useState<SyncSource | 'new' | null>(null);
  const [kind, setKind] = useState('');
  const [result, setResult] = useState('');
  const [running, setRunning] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const load = () => void send<SyncSetup>('/api/v1/admin/sync-sources', 'GET', undefined, admin.token).then(setSetup).catch((error: unknown) => toast(refusalText(error), 'bad'));
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sources = setup?.sources ?? [];
  const rows = useMemo(() => sources.filter((item) => (!kind || item.kind === kind) && (!result || (result === 'never' ? item.last_status === null : item.last_status === result))), [sources, kind, result]);
  const touch = () => { load(); setRefresh((now) => now + 1); };
  const run = async (item: SyncSource) => {
    setRunning(item.slug);
    try {
      const done = await send<SyncRun>(`/api/v1/admin/sync-sources/${item.slug}/run`, 'POST', undefined, admin.token);
      toast(copy.ran.replace('{status}', copy.status[done.status]).replace('{n}', num(done.attempts)), done.status === 'ok' ? 'ok' : 'bad');
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
    setRunning(null);
    touch();
  };
  const toggle = async (item: SyncSource, active: boolean) => {
    try {
      await send(`/api/v1/admin/sync-sources/${item.slug}`, 'PATCH', { active }, admin.token);
      load();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const remove = async (item: SyncSource) => {
    if (!(await confirmDialog({ title: copy.deleteTitle, body: copy.deleteBody.replace('{name}', item.name), tone: 'danger' }))) return;
    try {
      await send(`/api/v1/admin/sync-sources/${item.slug}`, 'DELETE', undefined, admin.token);
      toast(t.admin.saved);
      touch();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const columns: Column<SyncSource>[] = [
    { key: 'name', label: copy.name, sort: (first, second) => first.name.localeCompare(second.name), text: (item) => item.name, cell: (item) => <span className="grid min-w-0"><strong className="truncate">{item.name}</strong><span className="truncate font-mono text-caption text-muted-foreground">{item.slug}</span></span> },
    { key: 'kind', label: copy.kind, hideBelow: 'sm', sort: (first, second) => first.kind.localeCompare(second.kind), text: (item) => item.kind, cell: (item) => <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold">{copy.kinds[item.kind]}</span> },
    { key: 'url', label: copy.url, hideBelow: 'lg', text: (item) => item.base_url, cell: (item) => <span className="block max-w-[28ch] truncate font-mono text-footnote text-muted-foreground" title={item.base_url}>{item.method.toUpperCase()} {item.base_url}</span> },
    { key: 'schedule', label: copy.schedule, hideBelow: 'md', sort: (first, second) => (first.schedule_hours ?? 1e9) - (second.schedule_hours ?? 1e9), text: (item) => (item.schedule_hours ? String(item.schedule_hours) : ''), cell: (item) => <span className="text-footnote">{item.schedule_hours ? copy.scheduleOf.replace('{n}', num(item.schedule_hours)) : copy.manual}</span> },
    { key: 'last', label: copy.lastRun, sort: (first, second) => Number(first.last_run_at ?? 0) - Number(second.last_run_at ?? 0), text: (item) => `${item.last_status ?? ''} ${when(item.last_run_at)}`, cell: (item) => <span className="grid gap-1"><StatusBadge status={item.last_status} /><span className="whitespace-nowrap text-caption text-muted-foreground">{when(item.last_run_at)}</span></span> },
    { key: 'active', label: copy.active, align: 'end', sort: (first, second) => Number(first.active) - Number(second.active), text: (item) => (item.active ? 'on' : 'off'), cell: (item) => <Switch checked={item.active} onCheckedChange={(on) => void toggle(item, on)} aria-label={`${item.name}: ${copy.active}`} /> },
    {
      key: 'actions',
      label: '',
      align: 'end',
      cell: (item) => (
        <span className="inline-flex items-center gap-1">
          <Button variant="outline" size="sm" icon={Play} state={running === item.slug ? 'busy' : 'idle'} disabled={running !== null || !item.can_save} onClick={() => void run(item)}>{running === item.slug ? copy.running : copy.run}</Button>
          <IconButton icon={Pencil} label={copy.edit} onClick={() => setEditing(item)} />
          <IconButton icon={Trash} label={t.admin.delete} tone="danger" onClick={() => void remove(item)} />
        </span>
      ),
    },
  ];
  return (
    <div className="grid gap-6">
      <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
        <SectionTitle icon={Repeat} title={copy.title} lead={copy.lead} accent="aubergine" className="mb-0">
          <Button icon={Plus} onClick={() => setEditing('new')}>{copy.add}</Button>
        </SectionTitle>
        {setup && !setup.vault_ready && <p role="alert" className="pastel p-3 text-footnote font-semibold [--tile:var(--tint-blush)]">{copy.vaultMissing}</p>}
        <DataTable
          label={copy.title}
          rows={rows}
          columns={columns}
          rowKey={(item) => item.slug}
          searchText={(item) => `${item.name} ${item.slug} ${item.base_url}`.toLowerCase()}
          initialSort={{ key: 'name', dir: 'asc' }}
          exportName="sync-sources"
          empty={<p className="text-center text-subhead text-muted-foreground">{copy.noSources}</p>}
          filters={
            <div className="flex flex-wrap items-center gap-3">
              <Select value={kind} onChange={(event) => setKind(event.target.value)} aria-label={copy.filterKind}>
                <option value="">{copy.all}</option>
                {KINDS.map((value) => <option key={value} value={value}>{copy.kinds[value]}</option>)}
              </Select>
              <Select value={result} onChange={(event) => setResult(event.target.value)} aria-label={copy.filterStatus}>
                <option value="">{copy.all}</option>
                <option value="ok">{copy.status.ok}</option>
                <option value="failed">{copy.status.failed}</option>
                <option value="running">{copy.status.running}</option>
                <option value="never">{copy.never}</option>
              </Select>
            </div>
          }
        />
      </section>
      <SyncRuns admin={admin} sources={sources} refresh={refresh} />
      {editing && <SyncForm key={editing === 'new' ? 'new' : editing.slug} admin={admin} source={editing} vaultReady={setup?.vault_ready ?? false} onClose={() => setEditing(null)} onSaved={touch} />}
    </div>
  );
}
