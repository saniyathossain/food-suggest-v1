// Admin: accounts. Search name or email, filter by role and tier, page through 25 at a time; change a tier (admin), a role
// (super admin only, never your own) or switch an account off (ends its sessions). Every change is audited on the server.
import { useEffect, useState } from 'react';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Users } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Page, Role, Tier, UserAdmin } from '@/lib/types';

const ROLES: Role[] = ['super_admin', 'admin', 'editor', 'user'];

export function Accounts({ admin, tiers }: { admin: Admin; tiers: Tier[] }) {
  const { t, num } = useI18n();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<UserAdmin> | null>(null);
  const load = () => {
    const params = new URLSearchParams({ page: String(page), ...(query.trim() ? { q: query.trim() } : {}), ...(role ? { role } : {}), ...(tier ? { tier } : {}) });
    void send<Page<UserAdmin>>(`/api/v1/admin/users?${params}`, 'GET', undefined, admin.token).then(setData).catch(() => undefined);
  };
  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [query, role, tier, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = async (row: UserAdmin, body: Record<string, unknown>) => {
    try {
      await send(`/api/v1/admin/users/${row.id}`, 'PATCH', body, admin.token);
      toast(t.admin.saved);
      load();
    } catch (error) {
      toast(refusalText(error));
    }
  };
  const pages = data ? Math.max(1, Math.ceil(Number(data.total) / Number(data.per_page))) : 1;
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Users} title={t.admin.users} lead={t.admin.usersLead} accent="river" className="mb-0" />
      <div className="flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder={t.admin.searchUsers} className="max-w-xs" aria-label={t.admin.searchUsers} />
        <select aria-label={t.admin.role} value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }} className="field h-11 rounded-xl px-3 text-subhead">
          <option value="">{t.admin.role}: {t.admin.all}</option>
          {ROLES.map((item) => <option key={item} value={item}>{t.admin.roles[item]}</option>)}
        </select>
        <select aria-label={t.admin.tier} value={tier} onChange={(event) => { setTier(event.target.value); setPage(0); }} className="field h-11 rounded-xl px-3 text-subhead">
          <option value="">{t.admin.tier}: {t.admin.all}</option>
          {tiers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[720px] text-left text-subhead">
          <thead className="text-footnote text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-semibold">{t.auth.name}</th>
              <th className="py-2 pr-3 font-semibold">{t.admin.role}</th>
              <th className="py-2 pr-3 font-semibold">{t.admin.tier}</th>
              <th className="py-2 text-right font-semibold">{t.admin.activeLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <strong>{row.name || '—'}</strong>
                  <span className="block text-footnote text-muted-foreground">{row.email}</span>
                </td>
                <td className="py-3 pr-3">
                  <select aria-label={`${row.email}: ${t.admin.role}`} value={row.role} onChange={(event) => void patch(row, { role: event.target.value })} className="field h-9 rounded-lg px-2 text-footnote">
                    {ROLES.map((item) => <option key={item} value={item}>{t.admin.roles[item]}</option>)}
                  </select>
                </td>
                <td className="py-3 pr-3">
                  <select aria-label={`${row.email}: ${t.admin.tier}`} value={row.tier ?? ''} onChange={(event) => void patch(row, { tier: event.target.value || null })} className="field h-9 rounded-lg px-2 text-footnote">
                    <option value="">{t.admin.defaultTier}</option>
                    {tiers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                  </select>
                </td>
                <td className="py-3 text-right">
                  <Switch checked={row.active} onCheckedChange={(on) => void patch(row, { active: on })} aria-label={`${row.email}: ${t.admin.activeLabel}`} />
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">{t.admin.none}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 text-footnote text-muted-foreground">
        <span>{t.admin.pageOf.replace('{n}', num(page + 1)).replace('{m}', num(pages))}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{t.admin.previous}</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t.admin.next}</Button>
        </div>
      </div>
    </section>
  );
}
