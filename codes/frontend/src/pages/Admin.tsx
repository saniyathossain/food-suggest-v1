// Admin: unlock with the admin token or a staff session, then an overview of sections, each its own address (/admin/payments …;
// conditions one level deeper, /admin/conditions/:slug), with a breadcrumb built from the address. Every change goes live at once.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyRound } from '@/components/icons';
import { ArrowRight, BookOpen, CalendarClock, ChartLine, ChefHat, Clock, CreditCard, Crown, Database, HardDrive, ListChecks, Lock, Pill, Plus, Repeat, Server, Stethoscope, Users, Wallet } from '@/components/icons/page';
import { ConditionSettings } from '@/components/admin/ConditionSettings';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Accounts } from '@/components/admin/Accounts';
import { ContentTable } from '@/components/admin/ContentTable';
import { Medicines } from '@/components/admin/Medicines';
import { AuditTrail } from '@/components/admin/AuditTrail';
import { ContentCalendar } from '@/components/admin/ContentCalendar';
import { Coverage } from '@/components/admin/Coverage';
import { Insights } from '@/components/admin/Insights';
import { MediaUsage } from '@/components/admin/MediaUsage';
import { RulesIO } from '@/components/admin/RulesIO';
import { TiersEditor } from '@/components/admin/TiersEditor';
import { DietModes } from '@/components/admin/DietModes';
import { Gateways } from '@/components/admin/Gateways';
import { Payments } from '@/components/admin/Payments';
import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { NewFood } from '@/components/admin/NewFood';
import { FoodsTable } from '@/components/admin/FoodsTable';
import { RuleTable } from '@/components/admin/RuleTable';
import { SyncSources } from '@/components/admin/SyncSources';
import { Breadcrumb, type Crumb } from '@/components/admin/Breadcrumb';
import { useAdmin, type Admin as AdminState } from '@/components/admin/useAdmin';
import { PageBones } from '@/components/kit/routeskeleton';
import { MotionRoot } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { onLink, usePath } from '@/lib/router';
import { usePersisted } from '@/lib/persisted';
import type { SectionCountsDto, Tier } from '@/lib/types';

function Unlock({ admin }: { admin: AdminState }) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  return (
    <main className="page grid min-h-[70dvh] place-items-center">
      <form
        className="surface grid w-full max-w-md gap-5 rounded-2xl p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          void admin.load(input.trim());
        }}
      >
        <span className="tone-soft grid size-14 place-items-center rounded-xl [--tone:var(--aubergine)]">
          <KeyRound size={28} />
        </span>
        <div>
          <h1 className="text-title-1">{t.admin.title}</h1>
          <p className="mt-1 text-subhead text-muted-foreground">{t.admin.lead}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="token">{t.admin.token}</Label>
          <Input id="token" placeholder={t.ph.token} type="password" autoComplete="off" value={input} aria-invalid={admin.denied || undefined} onChange={(event) => setInput(event.target.value)} />
          {admin.denied && <p role="alert" className="text-footnote text-avoid-ink">{t.admin.denied}</p>}
        </div>
        <Button type="submit" icon={KeyRound} state={admin.busy ? 'busy' : 'idle'} disabled={!input.trim()} className="w-fit">
          {t.admin.unlock}
        </Button>
      </form>
    </main>
  );
}

type Section = { key: string; label: string; lead: string; Glyph: typeof Lock };

function useSections(): Section[] {
  const { t } = useI18n();
  return [
    { key: 'conditions', label: t.nav.conditions, lead: t.admin.sectionLeads.conditions, Glyph: Stethoscope },
    { key: 'coverage', label: t.admin.ops.sections.coverage, lead: t.admin.ops.leads.coverage, Glyph: ListChecks },
    { key: 'rulesio', label: t.admin.ops.sections.rulesio, lead: t.admin.ops.leads.rulesio, Glyph: Database },
    { key: 'foods', label: t.nav.foods, lead: t.admin.sectionLeads.foods, Glyph: Plus },
    { key: 'accounts', label: t.admin.users, lead: t.admin.usersLead, Glyph: Users },
    { key: 'tiers', label: t.admin.tiersTitle, lead: t.admin.tiersLead, Glyph: Crown },
    { key: 'payments', label: t.admin.paymentsTitle, lead: t.admin.paymentsLead, Glyph: CreditCard },
    { key: 'gateways', label: t.admin.gatewaysTitle, lead: t.admin.gatewaysLead, Glyph: Wallet },
    { key: 'medicines', label: t.admin.medicinesTitle, lead: t.admin.medicinesLead, Glyph: Pill },
    { key: 'modes', label: t.admin.modes, lead: t.admin.modesLead, Glyph: Clock },
    { key: 'recipes', label: t.recipes.title, lead: t.admin.sectionLeads.recipes, Glyph: ChefHat },
    { key: 'posts', label: t.blog.title, lead: t.admin.sectionLeads.posts, Glyph: BookOpen },
    { key: 'calendar', label: t.admin.ops.sections.calendar, lead: t.admin.ops.leads.calendar, Glyph: CalendarClock },
    { key: 'media', label: t.admin.ops.sections.media, lead: t.admin.ops.leads.media, Glyph: HardDrive },
    { key: 'insights', label: t.admin.ops.sections.insights, lead: t.admin.ops.leads.insights, Glyph: ChartLine },
    { key: 'audit', label: t.admin.ops.sections.audit, lead: t.admin.ops.leads.audit, Glyph: Server },
    { key: 'sync', label: t.admin.syncSources.title, lead: t.admin.syncSources.lead, Glyph: Repeat },
  ];
}

const GROUPS: { key: 'content' | 'people' | 'health' | 'system'; sections: string[] }[] = [
  { key: 'content', sections: ['conditions', 'foods', 'recipes', 'posts', 'calendar', 'media', 'rulesio', 'coverage'] },
  { key: 'people', sections: ['accounts', 'tiers', 'payments', 'gateways'] },
  { key: 'health', sections: ['medicines', 'modes'] },
  { key: 'system', sections: ['insights', 'audit', 'sync'] },
];

/** Which group a section sits in, for the breadcrumb and the sidebar's parent rows. */
const groupOf = (key: string) => GROUPS.find((group) => group.sections.includes(key))?.key;

/** The number beside a link: how many rows the section holds; payments show only those waiting for a check, in the warning colour. */
function Count({ value, alert }: { value: number | undefined; alert?: boolean }) {
  const { num } = useI18n();
  if (value === undefined || (alert && value === 0)) return null;
  return <span className={cn('console-count', alert && 'console-count-alert')}>{num(value)}</span>;
}

/** The left sidebar of the admin as a console window: the dashboard, then four parent groups that fold, each with its sections as
    children and a row count; the current section is marked and its group stays open. Hidden below 1024 px, where the pills above the
    page do the same job. */
function Sidebar({ sections, active, counts }: { sections: Section[]; active: string; counts: Record<string, number | undefined> }) {
  const { t } = useI18n();
  const [shut, setShut] = usePersisted<string[]>('pathya.admin.nav', []);
  const activeGroup = groupOf(active);
  const isShut = (group: string) => shut.includes(group) && group !== activeGroup;
  const toggle = (group: string) => setShut(shut.includes(group) ? shut.filter((item) => item !== group) : [...shut, group]);
  let line = 0;
  const entry = (key: string, label: string, Glyph: Section['Glyph'], count?: ReactNode, child = false) => {
    line += 1;
    return (
      <a key={key} href={key === '' ? '/admin' : `/admin/${key}`} onClick={onLink} aria-current={active === key ? 'page' : undefined} className={cn('console-link press', child && 'console-child')}>
        <span className="console-caret" aria-hidden>
          {active === key ? '❯' : String(line).padStart(2, '0')}
        </span>
        <Glyph size={15} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count}
      </a>
    );
  };
  return (
    <aside aria-label={t.admin.sections} className="console hidden lg:sticky lg:top-24 lg:grid" data-lenis-prevent>
      <div className="console-bar" aria-hidden>
        <i className="bg-[#ff5f57]" />
        <i className="bg-[#febc2e]" />
        <i className="bg-[#28c840]" />
        <span>pathya ~ admin</span>
      </div>
      <p className="console-prompt" aria-hidden>
        <b>$</b> cd /admin{active ? `/${active}` : ''}
        <em />
      </p>
      <nav className="console-body">
        {entry('', t.admin.groups.home, ChartLine)}
        {GROUPS.map((group) => {
          const items = group.sections.map((key) => sections.find((candidate) => candidate.key === key)).filter((item): item is Section => item !== undefined);
          const closed = isShut(group.key);
          const waiting = items.some((item) => item.key === 'payments' && (counts.payments ?? 0) > 0);
          return (
            <div key={group.key} className="grid gap-px">
              <button type="button" onClick={() => toggle(group.key)} aria-expanded={!closed} aria-controls={`nav-${group.key}`} className={cn('console-group press', group.key === activeGroup && 'console-group-on')}>
                <span aria-hidden className="console-fold">{closed ? '▸' : '▾'}</span>
                <span className="min-w-0 flex-1 truncate text-start"># {t.admin.groups[group.key]}</span>
                {closed && waiting && <span className="console-count console-count-alert">!</span>}
                <span className="console-count console-count-quiet">{items.length}</span>
              </button>
              {!closed && (
                <div id={`nav-${group.key}`} className="console-tree grid gap-px">
                  {items.map((item) => entry(item.key, item.label, item.Glyph, <Count value={counts[item.key]} alert={item.key === 'payments'} />, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/** The sections as a scrolling row of pills for phones and tablets (the sidebar takes over from 1024 px); the current one is brought into view. */
function Pills({ sections, active, counts }: { sections: Section[]; active: string; counts: Record<string, number | undefined> }) {
  const { t } = useI18n();
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    rail.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);
  return (
    <nav ref={rail} aria-label={t.admin.sections} className="max-w-full overflow-x-auto pb-1 lg:hidden">
      <ul className="flex w-max gap-1.5">
        {sections.map((item) => (
          <li key={item.key}>
            <a href={`/admin/${item.key}`} onClick={onLink} aria-current={item.key === active ? 'page' : undefined} className="press inline-flex h-9 items-center gap-1.5 rounded-full border bg-card/70 px-3.5 text-footnote font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:bg-ink aria-[current=page]:text-ink-foreground">
              <item.Glyph size={15} /> {item.label}
              <Count value={counts[item.key]} alert={item.key === 'payments'} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The conditions as a data table: name, status, review date and rule count, searchable and sortable; a row opens the condition. */
function ConditionsTable({ conditions, rules }: { conditions: AdminState['snapshot'] extends infer S ? (S extends { conditions: infer C } ? C : never) : never; rules: { condition_id: number }[] }) {
  const { t, lang, num } = useI18n();
  const counts = new Map<number, number>();
  rules.forEach((rule) => counts.set(rule.condition_id, (counts.get(rule.condition_id) ?? 0) + 1));
  type Row = (typeof conditions)[number];
  const name = (row: Row) => row.name[lang] || row.name.en;
  const columns: Column<Row>[] = [
    {
      key: 'name',
      label: t.nav.conditions,
      sort: (first, second) => name(first).localeCompare(name(second)),
      text: name,
      cell: (row) => (
        <a href={`/admin/conditions/${row.slug}`} onClick={onLink} className="flex items-center gap-3 font-semibold hover:text-primary">
          <i className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
          <span className="truncate">{name(row)}</span>
        </a>
      ),
    },
    { key: 'slug', label: 'Slug', hideBelow: 'md', sort: (first, second) => first.slug.localeCompare(second.slug), text: (row) => row.slug, cell: (row) => <span className="font-mono text-footnote text-muted-foreground">{row.slug}</span> },
    { key: 'status', label: t.admin.modeStatus, sort: (first, second) => Number(first.active) - Number(second.active), text: (row) => (row.active ? 'on' : 'off'), cell: (row) => <span className={row.active ? 'rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-bold text-recommended-ink' : 'rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-bold text-limit-ink'}>{row.active ? t.admin.on : t.admin.draft}</span> },
    { key: 'reviewed', label: t.admin.reviewedOn, hideBelow: 'sm', sort: (first, second) => (first.reviewed_on ?? '').localeCompare(second.reviewed_on ?? ''), text: (row) => row.reviewed_on ?? '', cell: (row) => <span className="text-footnote text-muted-foreground">{row.reviewed_on ?? '—'}</span> },
    { key: 'rules', label: t.admin.foodsTable.rules, align: 'end', sort: (first, second) => (counts.get(first.id) ?? 0) - (counts.get(second.id) ?? 0), text: (row) => counts.get(row.id) ?? 0, cell: (row) => num(counts.get(row.id) ?? 0) },
    { key: 'open', label: '', align: 'end', cell: (row) => <a href={`/admin/conditions/${row.slug}`} onClick={onLink} className="inline-flex" aria-label={name(row)}><ArrowRight size={16} className="text-faint-foreground" /></a> },
  ];
  return (
    <DataTable
      label={t.nav.conditions}
      rows={conditions}
      columns={columns}
      rowKey={(row) => row.slug}
      searchText={(row) => `${name(row)} ${row.slug}`.toLowerCase()}
      initialSort={{ key: 'name', dir: 'asc' }}
      exportName="conditions"
      empty={<p className="text-center text-subhead text-muted-foreground">{t.table.noRows}</p>}
    />
  );
}

export default function Admin() {
  const { t, lang } = useI18n();
  const path = usePath();
  const admin = useAdmin();
  const sections = useSections();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const loadTiers = () => void send<Tier[]>('/api/v1/admin/tiers', 'GET', undefined, admin.token).then(setTiers).catch(() => undefined);
  useEffect(() => {
    if (admin.snapshot) loadTiers();
  }, [Boolean(admin.snapshot)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [totals, setTotals] = useState<SectionCountsDto | null>(null);
  useEffect(() => {
    if (admin.snapshot) void send<SectionCountsDto>('/api/v1/admin/counts', 'GET', undefined, admin.token).then(setTotals).catch(() => undefined);
  }, [admin.snapshot]); // eslint-disable-line react-hooks/exhaustive-deps
  const known = admin.snapshot;
  const counts: Record<string, number | undefined> = {
    conditions: known?.conditions.length,
    foods: known?.foods.length,
    rulesio: known?.rules.length,
    recipes: known?.recipes?.length,
    posts: known?.posts?.length,
    medicines: known?.generics?.length,
    modes: known?.modes?.length,
    tiers: tiers.length || undefined,
    accounts: totals?.accounts,
    payments: totals?.payments_review,
    gateways: totals?.gateways,
    audit: totals?.audit,
    media: totals?.media,
  };
  if (!admin.snapshot && admin.busy) return <PageBones shape="admin" />;
  if (!admin.snapshot) return <Unlock admin={admin} />;
  // /admin, /admin/:section, /admin/conditions/:slug
  const [, , sectionKey = '', itemKey = ''] = path.split('/');
  const section = sections.find((item) => item.key === sectionKey);
  const conditions = admin.snapshot.conditions;
  const condition = section?.key === 'conditions' ? conditions.find((item) => item.slug === itemKey) : undefined;
  const trail: Crumb[] = [{ label: t.admin.title, href: '/admin' }];
  const group = section ? groupOf(section.key) : undefined;
  if (section && group) trail.push({ label: t.admin.groups[group] });
  if (section) trail.push({ label: section.label, href: `/admin/${section.key}` });
  if (condition) trail.push({ label: condition.name[lang] || condition.name.en });
  return (
    <MotionRoot>
      <div className="page grid gap-8 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <Sidebar sections={sections} active={section?.key ?? ''} counts={counts} />
        <main className="grid min-w-0 gap-8">
        <div className="grid gap-5">
          <Breadcrumb trail={trail} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-large-title">{condition ? condition.name[lang] || condition.name.en : section?.label ?? t.admin.title}</h1>
              <p className="mt-1 max-w-[70ch] text-subhead text-muted-foreground">{section?.lead ?? t.admin.lead}</p>
            </div>
            <Button variant="outline" icon={Lock} onClick={admin.lock}>
              {t.admin.lock}
            </Button>
          </div>
          <Pills sections={sections} active={section?.key ?? ''} counts={counts} />
        </div>
        <div className={cn('grid gap-8', section && !condition && 'admin-page')}>
        {!section && <Insights admin={admin} />}
        {section?.key === 'conditions' && !condition && <ConditionsTable conditions={conditions} rules={admin.snapshot.rules} />}
        {condition && (
          <>
            <ConditionSettings key={condition.slug} admin={admin} condition={condition} />
            <MediaLibrary admin={admin} condition={condition} />
            <RuleTable admin={admin} condition={condition} />
          </>
        )}
        {section?.key === 'coverage' && <Coverage admin={admin} />}
        {section?.key === 'rulesio' && <RulesIO admin={admin} />}
        {section?.key === 'calendar' && <ContentCalendar admin={admin} />}
        {section?.key === 'media' && <MediaUsage admin={admin} />}
        {section?.key === 'insights' && <Insights admin={admin} />}
        {section?.key === 'audit' && <AuditTrail admin={admin} />}
        {section?.key === 'sync' && <SyncSources admin={admin} />}
        {section?.key === 'foods' && (
          <div className="grid gap-8">
            <FoodsTable admin={admin} />
            <NewFood admin={admin} />
          </div>
        )}
        {section?.key === 'accounts' && <Accounts admin={admin} tiers={tiers} />}
        {section?.key === 'tiers' && tiers.length > 0 && <TiersEditor admin={admin} tiers={tiers} onSaved={loadTiers} />}
        {section?.key === 'payments' && <Payments admin={admin} />}
        {section?.key === 'gateways' && <Gateways admin={admin} />}
        {section?.key === 'medicines' && <Medicines admin={admin} />}
        {section?.key === 'modes' && <DietModes admin={admin} />}
        {section?.key === 'recipes' && <ContentTable admin={admin} kind="recipes" />}
        {section?.key === 'posts' && <ContentTable admin={admin} kind="posts" />}
        {sectionKey && !section && <p className="surface-soft rounded-xl p-6 text-callout">{t.admin.notFound}</p>}
        </div>
        </main>
      </div>
    </MotionRoot>
  );
}
