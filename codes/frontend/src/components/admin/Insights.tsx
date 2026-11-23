// Admin dashboard, one bento: a divided strip of the numbers to watch, visits as an area over the last thirty days beside the plan mix
// as a ring, then the busiest routes, new accounts, paid money by month and how the catalogue splits by food group. Traffic is counted
// without any personal data. Panels are single frames: nothing bordered sits inside another bordered thing.
import { useMemo } from 'react';
import { AreaChart } from '@/components/charts/AreaChart';
import { Donut, type Slice } from '@/components/charts/Donut';
import { type Admin } from '@/components/admin/useAdmin';
import { useGet } from '@/components/admin/useOps';
import { groupTone } from '@/components/kit/artwork';
import { useI18n } from '@/lib/i18n';
import type { PlanMix, SectionCountsDto, Traffic } from '@/lib/types';
import { cn } from '@/lib/utils';

/** The last `days` calendar days ending today, a count for each (zero where the API had no row), oldest first. */
function lastDays(rows: { day: string; count: number }[], days: number): { key: string; value: number }[] {
  const by = new Map(rows.map((row) => [row.day, row.count]));
  const out: { key: string; value: number }[] = [];
  const now = new Date();
  for (let back = days - 1; back >= 0; back--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    out.push({ key, value: by.get(key) ?? 0 });
  }
  return out;
}

function Panel({ title, lead, className, children }: { title: string; lead?: string | undefined; className?: string | undefined; children: React.ReactNode }) {
  return (
    <section className={cn('surface grid content-start gap-4 rounded-2xl p-5 sm:p-6', className)}>
      <header>
        <h2 className="text-headline">{title}</h2>
        {lead && <p className="mt-0.5 text-footnote text-muted-foreground">{lead}</p>}
      </header>
      {children}
    </section>
  );
}

/** Horizontal bars with the label above each: a route, a plan, a food group. */
function BarList({ rows, color }: { rows: { key: string; label: string; value: number; color?: string | undefined }[]; color: string }) {
  const { num } = useI18n();
  const peak = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="grid gap-2.5">
      {rows.map((row) => (
        <li key={row.key} className="grid gap-1">
          <span className="flex justify-between gap-3 text-footnote">
            <span className="truncate">{row.label}</span>
            <strong className="tabular-nums">{num(row.value)}</strong>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-foreground/8">
            <span className="block h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]" style={{ width: `${(row.value / peak) * 100}%`, background: row.color ?? color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Money by month as columns, the value above each; the last month is the strong one. */
function Columns({ rows, color }: { rows: { key: string; value: number; note: string }[]; color: string }) {
  const { num } = useI18n();
  const peak = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="flex h-44 items-end gap-2.5" role="list">
      {rows.map((row, index) => {
        const last = index === rows.length - 1;
        return (
          <li key={row.key} title={`${row.key}: ৳${num(row.value)} ${row.note}`} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 text-center">
            <span className="text-caption font-semibold tabular-nums">৳{num(row.value)}</span>
            <span className="w-full rounded-t-xl transition-[height] duration-700 ease-[var(--ease-out)]" style={{ height: `${Math.max(4, (row.value / peak) * 100)}%`, background: color, opacity: last ? 1 : 0.5 }} />
            <span className="truncate text-caption text-muted-foreground">{row.key.slice(2)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Insights({ admin }: { admin: Admin }) {
  const { t, num } = useI18n();
  const traffic = useGet<Traffic>('/api/v1/admin/traffic', admin.token);
  const mix = useGet<PlanMix>('/api/v1/admin/plan-mix', admin.token);
  const counts = useGet<SectionCountsDto>('/api/v1/admin/counts', admin.token);
  const visits = useMemo(() => lastDays(traffic.data?.days ?? [], 30), [traffic.data]);
  const signups = useMemo(() => lastDays(mix.data?.signups ?? [], 30), [mix.data]);
  const tones = ['var(--leaf)', 'var(--saffron)', 'var(--river)', 'var(--aubergine)', 'var(--coral)'];
  const slices: Slice[] = (mix.data?.tiers ?? []).map((tier, index) => ({ key: tier.slug, label: tier.name, value: tier.accounts, color: tones[index % tones.length] ?? 'var(--primary)' }));
  const money = mix.data?.revenue ?? [];
  const thisMonth = money[money.length - 1];
  const groups = (admin.snapshot?.categories ?? [])
    .map((category) => ({ key: category.slug, label: category.name.en, value: admin.snapshot?.foods.filter((food) => food.category_id === category.id).length ?? 0, color: groupTone(category.slug) }))
    .sort((first, second) => second.value - first.value);
  const stats: { label: string; value: string; note?: string | undefined; alert?: boolean }[] = [
    { label: t.admin.ops.accountsTotal, value: num(mix.data?.accounts ?? counts.data?.accounts ?? 0) },
    { label: t.admin.ops.traffic, value: num(traffic.data?.total ?? 0) },
    { label: t.admin.ops.revenue, value: thisMonth ? `৳${num(thisMonth.paid_bdt)}` : '৳0', note: thisMonth?.month },
    { label: t.admin.paymentsTitle, value: num(counts.data?.payments_review ?? 0), alert: (counts.data?.payments_review ?? 0) > 0 },
  ];
  return (
    <div className="grid gap-5">
      <section aria-label={t.admin.groups.home} className="surface grid grid-cols-2 divide-foreground/10 rounded-2xl lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-foreground/10 lg:[&>*:nth-child(-n+2)]:border-b-0">
        {stats.map((stat) => (
          <div key={stat.label} className="grid gap-1 px-5 py-4 sm:px-6">
            <span className="text-footnote text-muted-foreground">{stat.label}</span>
            <strong className={cn('text-title-1 tabular-nums', stat.alert && 'text-limit-ink')}>{stat.value}</strong>
            {stat.note && <span className="text-caption text-faint-foreground">{stat.note}</span>}
          </div>
        ))}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t.admin.ops.traffic} lead={t.admin.ops.trafficNote}>
          {traffic.error && <p role="alert" className="text-footnote text-avoid-ink">{traffic.error}</p>}
          {!traffic.data && !traffic.error && <span className="shimmer block h-44 rounded-xl" aria-busy="true" />}
          {traffic.data && <AreaChart points={visits} color="var(--leaf)" ariaLabel={`${t.admin.ops.traffic}: ${num(traffic.data.total)}`} format={(value) => num(value)} />}
        </Panel>
        <Panel title={t.admin.ops.planMix}>
          {mix.error && <p role="alert" className="text-footnote text-avoid-ink">{mix.error}</p>}
          {!mix.data && !mix.error && <span className="shimmer block h-44 rounded-xl" aria-busy="true" />}
          {mix.data && slices.some((slice) => slice.value > 0) && <Donut data={slices} total={num(mix.data.accounts)} center={t.admin.ops.accountsTotal} format={(value) => num(value)} ariaLabel={t.admin.ops.planMix} className="sm:flex-row lg:flex-col xl:flex-row" />}
          {mix.data && mix.data.roles.length > 0 && (
            <p className="flex flex-wrap gap-1.5 text-caption font-semibold">
              {mix.data.roles.map((role) => (
                <span key={role.role} className="rounded-full bg-muted px-2.5 py-1">
                  {t.admin.roles[role.role]} · {num(role.count)}
                </span>
              ))}
            </p>
          )}
        </Panel>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Panel title={t.admin.ops.trafficRoutes}>
          {traffic.data && traffic.data.routes.length === 0 && <p className="text-muted-foreground">{t.admin.ops.nothingYet}</p>}
          {traffic.data && <BarList color="var(--leaf)" rows={traffic.data.routes.slice(0, 8).map((route) => ({ key: route.route, label: route.route, value: route.hits }))} />}
        </Panel>
        <Panel title={t.admin.ops.signups}>
          {mix.data && <AreaChart points={signups} color="var(--river)" height={132} ariaLabel={t.admin.ops.signups} format={(value) => num(value)} />}
        </Panel>
        <Panel title={t.admin.ops.revenue}>
          {mix.data && money.length === 0 && <p className="text-muted-foreground">{t.admin.ops.nothingYet}</p>}
          {money.length > 0 && <Columns color="var(--saffron)" rows={money.map((month) => ({ key: month.month, value: month.paid_bdt, note: `${num(month.payments)} ${t.admin.ops.payments}` }))} />}
        </Panel>
      </div>
      {groups.length > 0 && (
        <Panel title={t.nav.foods} lead={`${num(admin.snapshot?.foods.length ?? 0)} · ${num(groups.length)} ${t.admin.foodsTable.group.toLowerCase()}`}>
          <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <BarList color="var(--primary)" rows={groups.slice(0, Math.ceil(groups.length / 3))} />
            <BarList color="var(--primary)" rows={groups.slice(Math.ceil(groups.length / 3), Math.ceil((groups.length * 2) / 3))} />
            <BarList color="var(--primary)" rows={groups.slice(Math.ceil((groups.length * 2) / 3))} />
          </div>
        </Panel>
      )}
    </div>
  );
}
