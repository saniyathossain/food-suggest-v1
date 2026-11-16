// Admin: recipes and articles. Search by title (either language), filter by group and status, publish or hide each — the site
// follows at once. A row without a photo is flagged so it can get one from the media library.
import { useEffect, useMemo, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { BookOpen } from '@/components/icons/page';
import { Utensils } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ContentAdmin } from '@/lib/types';

type Status = 'all' | 'on' | 'off';

export function ContentTable({ admin, kind }: { admin: Admin; kind: 'recipes' | 'posts' }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<ContentAdmin[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const base = `/api/v1/admin/${kind}`;
  const load = () => void send<ContentAdmin[]>(base, 'GET', undefined, admin.token).then(setRows).catch(() => undefined);
  useEffect(load, [admin.token, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => [...new Set(rows.map((row) => row.group).filter(Boolean))], [rows]);
  const needle = query.trim().toLowerCase();
  const shown = rows.filter(
    (row) =>
      (!group || row.group === group) &&
      (status === 'all' || (status === 'on') === row.published) &&
      (!needle || `${row.title_en} ${row.title_bn} ${row.slug}`.toLowerCase().includes(needle)),
  );
  const toggle = async (row: ContentAdmin, published: boolean) => {
    setRows((current) => current.map((item) => (item.slug === row.slug ? { ...item, published } : item)));
    try {
      await send(`${base}/${row.slug}`, 'PATCH', { published }, admin.token);
      admin.saved();
    } catch (error) {
      toast(refusalText(error));
      load();
    }
  };
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={kind === 'recipes' ? Utensils : BookOpen} title={kind === 'recipes' ? t.recipes.title : t.blog.title} accent={kind === 'recipes' ? 'saffron' : 'aubergine'} className="mb-0" />
      <div className="flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.recipes.search} className="max-w-xs" aria-label={t.foods.filters} />
        {groups.length > 1 && (
          <Segmented label={t.admin.kind} value={group} onChange={setGroup} options={[{ value: '', label: t.admin.all }, ...groups.map((item) => ({ value: item, label: item.replace(/-/g, ' ') }))]} />
        )}
        <Segmented label={t.admin.modeStatus} value={status} onChange={(value) => setStatus(value as Status)} options={[{ value: 'all', label: t.admin.all }, { value: 'on', label: t.admin.on }, { value: 'off', label: t.admin.off }]} />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[520px] text-left text-subhead">
          <tbody>
            {shown.map((row) => (
              <tr key={row.slug} className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <strong>{lang === 'bn' ? row.title_bn || row.title_en : row.title_en}</strong>
                  <span className="block text-footnote text-muted-foreground">
                    {row.slug} · {row.group.replace(/-/g, ' ')}
                    {!row.has_image && <span className="ml-2 text-limit-ink">{t.admin.noPhoto}</span>}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Switch checked={row.published} onCheckedChange={(on) => void toggle(row, on)} aria-label={`${row.title_en}: ${row.published ? t.admin.on : t.admin.off}`} />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td className="py-6 text-center text-muted-foreground">{t.admin.none}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
