// Admin: recipes and articles as a data table. Search by title (either language), filter by group and status, sort, page, export; publish or
// hide each row with its switch (the site follows at once). A row without a photo is flagged so it can get one from the media library.
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { FilterChip } from '@/components/kit/filterchip';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { BookOpen, Trash } from '@/components/icons/page';
import { IconButton } from '@/components/ui/icon-button';
import { confirmDialog } from '@/lib/confirm';
import { Utensils } from '@/components/icons';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { toggle } from '@/lib/foodfilters';
import { useI18n } from '@/lib/i18n';
import type { ContentAdmin } from '@/lib/types';

export function ContentTable({ admin, kind }: { admin: Admin; kind: 'recipes' | 'posts' }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<ContentAdmin[] | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [status, setStatus] = useState<'' | 'on' | 'off'>('');
  const [noPhoto, setNoPhoto] = useState(false);
  const base = `/api/v1/admin/${kind}`;
  const load = () => void send<ContentAdmin[]>(base, 'GET', undefined, admin.token).then(setRows).catch(() => undefined);
  useEffect(load, [admin.token, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = useMemo(() => rows ?? [], [rows]);
  const names = useMemo(() => [...new Set(all.map((row) => row.group).filter(Boolean))], [all]);
  const title = (row: ContentAdmin) => (lang === 'bn' ? row.title_bn || row.title_en : row.title_en);
  const shown = all.filter((row) => (groups.length === 0 || groups.includes(row.group)) && (status === '' || (status === 'on') === row.published) && (!noPhoto || !row.has_image));
  const publish = async (row: ContentAdmin, published: boolean) => {
    setRows((current) => (current ?? []).map((item) => (item.slug === row.slug ? { ...item, published } : item)));
    try {
      await send(`${base}/${row.slug}`, 'PATCH', { published }, admin.token);
      admin.saved();
    } catch (error) {
      toast(refusalText(error), 'bad');
      load();
    }
  };
  const remove = async (row: ContentAdmin) => {
    if (!(await confirmDialog({ title: t.admin.deleteContentTitle, body: title(row), tone: 'danger' }))) return;
    try {
      await send(`${base}/${row.slug}`, 'DELETE', undefined, admin.token);
      admin.saved();
      load();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const heading = kind === 'recipes' ? t.recipes.title : t.blog.title;
  const columns: Column<ContentAdmin>[] = [
    {
      key: 'title',
      label: heading,
      sort: (first, second) => title(first).localeCompare(title(second)),
      text: title,
      cell: (row) => (
        <span className="grid min-w-0">
          <strong className="truncate">{title(row)}</strong>
          <span className="truncate text-footnote text-muted-foreground">{row.slug}</span>
        </span>
      ),
    },
    { key: 'group', label: t.admin.kind, hideBelow: 'sm', sort: (first, second) => first.group.localeCompare(second.group), text: (row) => row.group, cell: (row) => <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold capitalize">{row.group.replace(/-/g, ' ')}</span> },
    { key: 'photo', label: t.admin.foodsTable.photo, hideBelow: 'sm', sort: (first, second) => Number(first.has_image) - Number(second.has_image), text: (row) => (row.has_image ? 'yes' : 'no'), cell: (row) => <span className={row.has_image ? 'text-footnote text-recommended-ink' : 'text-footnote font-semibold text-limit-ink'}>{row.has_image ? t.admin.foodsTable.has : t.admin.noPhoto}</span> },
    {
      key: 'published',
      label: t.admin.modeStatus,
      align: 'end',
      sort: (first, second) => Number(first.published) - Number(second.published),
      text: (row) => (row.published ? 'published' : 'hidden'),
      cell: (row) => <Switch checked={row.published} onCheckedChange={(on) => void publish(row, on)} aria-label={`${row.title_en}: ${row.published ? t.admin.on : t.admin.off}`} />,
    },
    { key: 'delete', label: '', align: 'end', cell: (row) => <IconButton icon={Trash} label={t.admin.delete} tone="danger" onClick={() => void remove(row)} /> },
  ];
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={kind === 'recipes' ? Utensils : BookOpen} title={heading} accent={kind === 'recipes' ? 'saffron' : 'aubergine'} className="mb-0" />
      {!rows ? (
        <span className="shimmer block h-60 rounded-2xl" aria-busy="true" />
      ) : (
        <DataTable
          label={heading}
          rows={shown}
          columns={columns}
          rowKey={(row) => row.slug}
          searchText={(row) => `${row.title_en} ${row.title_bn} ${row.slug}`.toLowerCase()}
          initialSort={{ key: 'title', dir: 'asc' }}
          exportName={kind}
          empty={<p className="text-center text-subhead text-muted-foreground">{t.table.noRows}</p>}
          filters={
            <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.foods.filters}>
              <FilterChip on={status === 'on'} onClick={() => setStatus(status === 'on' ? '' : 'on')} label={t.admin.on} count={all.filter((row) => row.published).length} color="var(--recommended)" />
              <FilterChip on={status === 'off'} onClick={() => setStatus(status === 'off' ? '' : 'off')} label={t.admin.off} count={all.filter((row) => !row.published).length} color="var(--limit)" />
              <FilterChip on={noPhoto} onClick={() => setNoPhoto(!noPhoto)} label={t.admin.noPhoto} count={all.filter((row) => !row.has_image).length} color="var(--limit)" />
              {names.map((item) => (
                <FilterChip key={item} on={groups.includes(item)} onClick={() => setGroups(toggle(groups, item))} label={item.replace(/-/g, ' ')} count={all.filter((row) => row.group === item).length} />
              ))}
            </div>
          }
        />
      )}
    </section>
  );
}
