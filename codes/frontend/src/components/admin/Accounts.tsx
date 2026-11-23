// Admin: accounts as a data table. Search name or email, filter by role and tier, page through 25 at a time (the server pages and searches);
// change a tier (admin), a role (super admin only, never your own) or switch an account off (ends its sessions). Every change is audited.
import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { refusalText, type Admin } from '@/components/admin/useAdmin';
import { SectionTitle } from '@/components/kit/section';
import { toast } from '@/components/kit/toast';
import { Users } from '@/components/icons/page';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Page, Role, Tier, UserAdmin } from '@/lib/types';

const ROLES: Role[] = ['super_admin', 'admin', 'editor', 'medical_reviewer', 'user'];

export function Accounts({ admin, tiers }: { admin: Admin; tiers: Tier[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [data, setData] = useState<Page<UserAdmin> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => {
    setBusy(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(query.trim() ? { q: query.trim() } : {}), ...(role ? { role } : {}), ...(tier ? { tier } : {}) });
    void send<Page<UserAdmin>>(`/api/v1/admin/users?${params}`, 'GET', undefined, admin.token)
      .then(setData)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };
  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [query, role, tier, page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = async (row: UserAdmin, body: Record<string, unknown>) => {
    try {
      await send(`/api/v1/admin/users/${row.id}`, 'PATCH', body, admin.token);
      toast(t.admin.saved);
      load();
    } catch (error) {
      toast(refusalText(error), 'bad');
    }
  };
  const columns: Column<UserAdmin>[] = [
    {
      key: 'name',
      label: t.journey.steps.account.name,
      sort: (first, second) => (first.name || first.email).localeCompare(second.name || second.email),
      text: (row) => `${row.name} <${row.email}>`,
      cell: (row) => (
        <span className="grid min-w-0">
          <strong className="truncate">{row.name || '—'}</strong>
          <span className="truncate text-footnote text-muted-foreground">{row.email}</span>
        </span>
      ),
    },
    {
      key: 'role',
      label: t.admin.role,
      sort: (first, second) => ROLES.indexOf(first.role) - ROLES.indexOf(second.role),
      text: (row) => row.role,
      cell: (row) => (
        <Select as="menu" aria-label={`${row.email}: ${t.admin.role}`} value={row.role} onChange={(event) => void patch(row, { role: event.target.value })} className="!h-9 !w-32 !text-footnote sm:!w-44">
          {ROLES.map((item) => <option key={item} value={item}>{t.admin.roles[item]}</option>)}
        </Select>
      ),
    },
    {
      key: 'tier',
      label: t.admin.tier,
      sort: (first, second) => (first.tier ?? '').localeCompare(second.tier ?? ''),
      text: (row) => row.tier ?? '',
      hideBelow: 'sm',
      cell: (row) => (
        <Select as="menu" aria-label={`${row.email}: ${t.admin.tier}`} value={row.tier ?? ''} onChange={(event) => void patch(row, { tier: event.target.value || null })} className="!h-9 !w-40 !text-footnote">
          <option value="">{t.admin.defaultTier}</option>
          {tiers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </Select>
      ),
    },
    {
      key: 'active',
      label: t.admin.activeLabel,
      align: 'end',
      sort: (first, second) => Number(first.active) - Number(second.active),
      text: (row) => (row.active ? 'on' : 'off'),
      cell: (row) => <Switch checked={row.active} onCheckedChange={(on) => void patch(row, { active: on })} aria-label={`${row.email}: ${t.admin.activeLabel}`} />,
    },
  ];
  return (
    <section className="surface grid gap-4 rounded-2xl p-5 sm:p-6">
      <SectionTitle icon={Users} title={t.admin.users} lead={t.admin.usersLead} accent="river" className="mb-0" />
      <DataTable
        label={t.admin.users}
        rows={data?.items ?? []}
        columns={columns}
        rowKey={(row) => String(row.id)}
        exportName="accounts"
        empty={<p className="text-center text-subhead text-muted-foreground">{t.admin.none}</p>}
        server={{ total: Number(data?.total ?? 0), page, perPage: Number(data?.per_page ?? 25), onPage: setPage, query, onQuery: setQuery, loading: busy, onPerPage: setPerPage }}
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <Select aria-label={t.admin.role} value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }} className="!h-10 !w-auto min-w-48 !rounded-full">
              <option value="">{t.admin.role}: {t.admin.all}</option>
              {ROLES.map((item) => <option key={item} value={item}>{t.admin.roles[item]}</option>)}
            </Select>
            <Select aria-label={t.admin.tier} value={tier} onChange={(event) => { setTier(event.target.value); setPage(0); }} className="!h-10 !w-auto min-w-44 !rounded-full">
              <option value="">{t.admin.tier}: {t.admin.all}</option>
              {tiers.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </Select>
          </div>
        }
      />
    </section>
  );
}
