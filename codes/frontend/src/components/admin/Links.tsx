// Admin: every link between foods, conditions, medicines, allergens and readings in one table (the table the plan reads for each kind of
// pair is the one that is written), with filters by kind and verdict, a form to add a link, and edit and delete per row. A food, condition
// or medicine is picked from the server (RemoteSelect); an allergen or a reading from the closed lists the API hands back.
import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { Pencil, Plus, Trash, X } from '@/components/icons/page';
import { FilterChip } from '@/components/kit/filterchip';
import { RemoteSelect } from '@/components/kit/remoteselect';
import { toast } from '@/components/kit/toast';
import { LINK_KINDS, LINK_VERDICTS, LinkBadge, useEndLabel } from '@/components/links/shared';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send, useResource, endpoints } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import type { AdminLink, AdminLinksPage, Bootstrap, LinkEnd, LinkKind, LinkVerdict } from '@/lib/types';

type Source = { key: string; title: { en: string; bn: string } };
type Pick = { kind: LinkKind; key: string };
const BASE = '/api/v1/admin/links';
const REMOTE = { food: 'foods', condition: 'conditions', medicine: 'medicines' } as const;

/** One end of a new link: its kind, then the thing itself. */
function EndPicker({ admin, legend, value, onChange, criteria, allergens }: { admin: Admin; legend: string; value: Pick; onChange: (value: Pick) => void; criteria: string[]; allergens: string[] }) {
  const { t } = useI18n();
  const label = useEndLabel();
  const named = (kind: LinkKind, key: string) => label({ kind, key, label: null, hint: null });
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="text-footnote font-semibold text-muted-foreground">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <Select aria-label={`${legend}: ${t.admin.linksAdmin.kind}`} value={value.kind} onChange={(event) => onChange({ kind: event.target.value as LinkKind, key: '' })}>
          {LINK_KINDS.map((kind) => (
            <option key={kind} value={kind}>{t.links.kinds[kind]}</option>
          ))}
        </Select>
        {value.kind === 'food' || value.kind === 'condition' || value.kind === 'medicine' ? (
          <RemoteSelect kind={REMOTE[value.kind]} token={admin.token} aria-label={legend} value={value.key} placeholder={t.admin.linksAdmin.pick} onChange={(key) => onChange({ kind: value.kind, key })} />
        ) : (
          <Select aria-label={legend} value={value.key} onChange={(event) => onChange({ kind: value.kind, key: event.target.value })}>
            <option value="">{t.admin.linksAdmin.pick}</option>
            {(value.kind === 'allergen' ? allergens : criteria).map((key) => (
              <option key={key} value={key}>{named(value.kind, key)}</option>
            ))}
          </Select>
        )}
      </div>
    </fieldset>
  );
}

function VerdictSelect({ value, onChange, label }: { value: LinkVerdict; onChange: (value: LinkVerdict) => void; label: string }) {
  const { t } = useI18n();
  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as LinkVerdict)}>
      {LINK_VERDICTS.map((verdict) => (
        <option key={verdict} value={verdict}>{t.links.verdict[verdict]}</option>
      ))}
    </Select>
  );
}

function SourceSelect({ sources, value, onChange }: { sources: Source[]; value: string; onChange: (value: string) => void }) {
  const { t, lang } = useI18n();
  return (
    <Select aria-label={t.admin.linksAdmin.sourceKey} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{t.admin.linksAdmin.noSource}</option>
      {sources.map((source) => (
        <option key={source.key} value={source.key}>{source.title[lang] || source.title.en}</option>
      ))}
    </Select>
  );
}

function AddLink({ admin, criteria, allergens, sources, onSaved }: { admin: Admin; criteria: string[]; allergens: string[]; sources: Source[]; onSaved: () => void }) {
  const { t } = useI18n();
  const empty = { first: { kind: 'condition' as LinkKind, key: '' }, second: { kind: 'medicine' as LinkKind, key: '' }, verdict: 'ok' as LinkVerdict, en: '', bn: '', source: '' };
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const allergenLink = draft.first.kind === 'allergen' || draft.second.kind === 'allergen';
  const ready = draft.first.key && draft.second.key && (allergenLink || draft.en.trim());
  const add = async () => {
    setBusy(true);
    try {
      await send(BASE, 'POST', { first: draft.first, second: draft.second, verdict: draft.verdict, reason: { en: draft.en, bn: draft.bn }, source: draft.source || undefined }, admin.token);
      setDraft(empty);
      toast(t.admin.saved);
      onSaved();
    } catch (failure) {
      toast(refusalText(failure), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="surface grid gap-4 rounded-2xl p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void add(); }}>
      <h2 className="text-title-3">{t.admin.linksAdmin.add}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <EndPicker admin={admin} legend={t.admin.linksAdmin.first} value={draft.first} onChange={(first) => setDraft({ ...draft, first })} criteria={criteria} allergens={allergens} />
        <EndPicker admin={admin} legend={t.admin.linksAdmin.second} value={draft.second} onChange={(second) => setDraft({ ...draft, second })} criteria={criteria} allergens={allergens} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="link-verdict">{t.admin.verdict}</Label>
          <VerdictSelect label={t.admin.verdict} value={draft.verdict} onChange={(verdict) => setDraft({ ...draft, verdict })} />
          <p className="text-caption text-muted-foreground">{t.admin.linksAdmin.verdictNote}</p>
        </div>
        <div className="grid gap-1.5">
          <Label>{t.admin.linksAdmin.sourceKey}</Label>
          <SourceSelect sources={sources} value={draft.source} onChange={(source) => setDraft({ ...draft, source })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="link-en">{t.admin.reasonEn}</Label>
          <Textarea id="link-en" rows={2} value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="link-bn">{t.admin.reasonBn}</Label>
          <Textarea id="link-bn" lang="bn" rows={2} value={draft.bn} onChange={(event) => setDraft({ ...draft, bn: event.target.value })} />
        </div>
      </div>
      {allergenLink && <p className="text-caption text-muted-foreground">{t.admin.linksAdmin.reasonNote}</p>}
      <Button type="submit" icon={Plus} state={busy ? 'busy' : 'idle'} disabled={!ready} className="w-fit">
        {t.admin.linksAdmin.add}
      </Button>
    </form>
  );
}

function EditLink({ admin, row, sources, onDone }: { admin: Admin; row: AdminLink; sources: Source[]; onDone: (saved: boolean) => void }) {
  const { t } = useI18n();
  const label = useEndLabel();
  const [draft, setDraft] = useState({ verdict: row.verdict, en: row.reason.en, bn: row.reason.bn, source: row.source ?? '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await send(`${BASE}/${encodeURIComponent(row.id)}`, 'PATCH', { verdict: draft.verdict, reason: { en: draft.en, bn: draft.bn }, source: draft.source || null }, admin.token);
      toast(t.admin.saved);
      onDone(true);
    } catch (failure) {
      toast(refusalText(failure), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="surface grid gap-4 rounded-2xl p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-3">{t.admin.linksAdmin.editing.replace('{a}', label(row.first)).replace('{b}', label(row.second))}</h2>
        <IconButton icon={X} label={t.admin.linksAdmin.cancel} tone="soft" onClick={() => onDone(false)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>{t.admin.verdict}</Label>
          <VerdictSelect label={t.admin.verdict} value={draft.verdict} onChange={(verdict) => setDraft({ ...draft, verdict })} />
        </div>
        <div className="grid gap-1.5">
          <Label>{t.admin.linksAdmin.sourceKey}</Label>
          <SourceSelect sources={sources} value={draft.source} onChange={(source) => setDraft({ ...draft, source })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-en">{t.admin.reasonEn}</Label>
          <Textarea id="edit-en" rows={3} value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-bn">{t.admin.reasonBn}</Label>
          <Textarea id="edit-bn" lang="bn" rows={3} value={draft.bn} onChange={(event) => setDraft({ ...draft, bn: event.target.value })} />
        </div>
      </div>
      <Button type="submit" state={busy ? 'busy' : 'idle'} disabled={!draft.en.trim()} className="w-fit">
        {t.admin.save}
      </Button>
    </form>
  );
}

export function Links({ admin }: { admin: Admin }) {
  const { t, lang, num } = useI18n();
  const label = useEndLabel();
  const { data: boot } = useResource<Bootstrap>(endpoints.bootstrap(lang));
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<LinkKind | ''>('');
  const [verdict, setVerdict] = useState<LinkVerdict | ''>('');
  const [data, setData] = useState<AdminLinksPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminLink | null>(null);
  const [tick, setTick] = useState(0);
  const sources = ((admin.snapshot as unknown as { sources?: Source[] } | null)?.sources ?? []) as Source[];

  useEffect(() => {
    let live = true;
    setBusy(true);
    const url = `${BASE}?lang=${lang}&page=${page}&per_page=${perPage}&q=${encodeURIComponent(query)}${kind ? `&to=${kind}` : ''}${verdict ? `&verdict=${verdict}` : ''}`;
    void send<AdminLinksPage>(url, 'GET', undefined, admin.token)
      .then((next) => live && setData(next))
      .catch((failure: unknown) => live && toast(refusalText(failure), 'bad'))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [admin.token, lang, page, perPage, query, kind, verdict, tick]);

  const reload = useCallback(() => setTick((now) => now + 1), []);
  const remove = async (row: AdminLink) => {
    if (!(await confirmDialog({ title: t.admin.linksAdmin.deleteTitle, body: `${label(row.first)} · ${label(row.second)}. ${t.admin.linksAdmin.deleteBody}`, tone: 'danger' }))) return;
    try {
      await send(`${BASE}/${encodeURIComponent(row.id)}`, 'DELETE', undefined, admin.token);
      toast(t.admin.saved);
      reload();
    } catch (failure) {
      toast(refusalText(failure), 'bad');
    }
  };
  const end = (item: LinkEnd) => (
    <span className="grid min-w-0">
      <span className="break-words font-semibold">{label(item)}</span>
      <span className="text-caption text-muted-foreground">{t.links.kinds[item.kind]}</span>
    </span>
  );
  const columns: Column<AdminLink>[] = [
    { key: 'first', label: t.admin.linksAdmin.first, cell: (row) => end(row.first), sort: (a, b) => label(a.first).localeCompare(label(b.first)), text: (row) => label(row.first) },
    { key: 'second', label: t.admin.linksAdmin.second, cell: (row) => end(row.second), sort: (a, b) => label(a.second).localeCompare(label(b.second)), text: (row) => label(row.second) },
    { key: 'verdict', label: t.admin.verdict, cell: (row) => <LinkBadge verdict={row.verdict} />, sort: (a, b) => LINK_VERDICTS.indexOf(a.verdict) - LINK_VERDICTS.indexOf(b.verdict), text: (row) => row.verdict },
    { key: 'reason', label: lang === 'bn' ? t.admin.reasonBn : t.admin.reasonEn, hideBelow: 'md', cell: (row) => <span className="line-clamp-2 text-footnote">{(lang === 'bn' ? row.reason.bn : '') || row.reason.en}</span>, text: (row) => row.reason.en },
    { key: 'origin', label: t.admin.linksAdmin.origin, hideBelow: 'lg', cell: (row) => <span className="text-footnote text-muted-foreground">{t.links.origin[row.origin]}{row.merged > 0 ? ` +${num(row.merged)}` : ''}</span>, text: (row) => row.origin },
    {
      key: 'actions',
      label: t.admin.actions,
      align: 'end',
      cell: (row) =>
        row.editable ? (
          <span className="flex justify-end gap-1">
            {row.origin !== 'allergen' && <IconButton icon={Pencil} label={t.admin.linksAdmin.edit} tone="soft" onClick={() => setEditing(row)} />}
            <IconButton icon={Trash} label={t.admin.delete} tone="danger" onClick={() => void remove(row)} />
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">{t.admin.linksAdmin.readOnly}</span>
        ),
    },
  ];
  const counts = data?.counts ?? [];
  return (
    <div className="grid gap-8">
      {editing && <EditLink key={editing.id} admin={admin} row={editing} sources={sources} onDone={(saved) => { setEditing(null); if (saved) reload(); }} />}
      <DataTable
        label={t.admin.linksAdmin.title}
        rows={data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        empty={<p className="text-center text-subhead text-muted-foreground">{t.table.noRows}</p>}
        exportName="links"
        server={{ total: data?.total ?? 0, page: data?.page ?? 0, perPage, onPage: setPage, query, onQuery: (text) => { setQuery(text); setPage(0); }, loading: busy, onPerPage: (size) => { setPerPage(size); setPage(0); } }}
        filters={
          <div className="grid gap-2">
            <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.links.filter}>
              <FilterChip on={kind === ''} onClick={() => { setKind(''); setPage(0); }} label={t.links.all} />
              {counts.map((slot) => (
                <FilterChip key={slot.kind} on={kind === slot.kind} onClick={() => { setKind(kind === slot.kind ? '' : slot.kind); setPage(0); }} label={t.links.kinds[slot.kind]} count={slot.count} />
              ))}
            </div>
            <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.admin.verdict}>
              {LINK_VERDICTS.map((item) => (
                <FilterChip key={item} on={verdict === item} onClick={() => { setVerdict(verdict === item ? '' : item); setPage(0); }} label={t.links.verdict[item]} />
              ))}
            </div>
          </div>
        }
      />
      <AddLink admin={admin} criteria={data?.criteria ?? []} allergens={boot?.allergens ?? []} sources={sources} onSaved={reload} />
    </div>
  );
}
