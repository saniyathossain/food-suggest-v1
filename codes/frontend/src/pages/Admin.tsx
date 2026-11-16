// Admin: unlock with the admin token or a staff session, then an overview of sections, each its own address (/admin/payments …;
// conditions one level deeper, /admin/conditions/:slug), with a breadcrumb built from the address. Every change goes live at once.
import { useEffect, useState } from 'react';
import { KeyRound } from '@/components/icons';
import { ArrowRight, BookOpen, ChefHat, Clock, CreditCard, Crown, Lock, Pill, Plus, Stethoscope, Users, Wallet } from '@/components/icons/page';
import { ConditionSettings } from '@/components/admin/ConditionSettings';
import { Accounts } from '@/components/admin/Accounts';
import { ContentTable } from '@/components/admin/ContentTable';
import { Medicines } from '@/components/admin/Medicines';
import { TiersEditor } from '@/components/admin/TiersEditor';
import { DietModes } from '@/components/admin/DietModes';
import { Gateways } from '@/components/admin/Gateways';
import { Payments } from '@/components/admin/Payments';
import { MediaLibrary } from '@/components/admin/MediaLibrary';
import { NewFood } from '@/components/admin/NewFood';
import { RuleTable } from '@/components/admin/RuleTable';
import { Breadcrumb, type Crumb } from '@/components/admin/Breadcrumb';
import { useAdmin, type Admin as AdminState } from '@/components/admin/useAdmin';
import { PageBones } from '@/components/kit/routeskeleton';
import { MotionRoot } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { onLink, usePath } from '@/lib/router';
import type { Tier } from '@/lib/types';

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
    { key: 'foods', label: t.admin.newFood, lead: t.admin.sectionLeads.foods, Glyph: Plus },
    { key: 'accounts', label: t.admin.users, lead: t.admin.usersLead, Glyph: Users },
    { key: 'tiers', label: t.admin.tiersTitle, lead: t.admin.tiersLead, Glyph: Crown },
    { key: 'payments', label: t.admin.paymentsTitle, lead: t.admin.paymentsLead, Glyph: CreditCard },
    { key: 'gateways', label: t.admin.gatewaysTitle, lead: t.admin.gatewaysLead, Glyph: Wallet },
    { key: 'medicines', label: t.admin.medicinesTitle, lead: t.admin.medicinesLead, Glyph: Pill },
    { key: 'modes', label: t.admin.modes, lead: t.admin.modesLead, Glyph: Clock },
    { key: 'recipes', label: t.recipes.title, lead: t.admin.sectionLeads.recipes, Glyph: ChefHat },
    { key: 'posts', label: t.blog.title, lead: t.admin.sectionLeads.posts, Glyph: BookOpen },
  ];
}

function Overview({ sections }: { sections: Section[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <li key={section.key}>
          <a href={`/admin/${section.key}`} onClick={onLink} className="surface group grid h-full content-start gap-3 rounded-[26px] p-6">
            <span className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl border bg-card"><section.Glyph size={20} /></span>
              <ArrowRight size={18} className="text-faint-foreground transition-transform group-hover:translate-x-1" />
            </span>
            <strong className="text-title-3">{section.label}</strong>
            <span className="line-clamp-2 text-subhead text-muted-foreground">{section.lead}</span>
          </a>
        </li>
      ))}
    </ul>
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
  if (!admin.snapshot && admin.busy) return <PageBones shape="admin" />;
  if (!admin.snapshot) return <Unlock admin={admin} />;
  // /admin, /admin/:section, /admin/conditions/:slug
  const [, , sectionKey = '', itemKey = ''] = path.split('/');
  const section = sections.find((item) => item.key === sectionKey);
  const conditions = admin.snapshot.conditions;
  const condition = section?.key === 'conditions' ? conditions.find((item) => item.slug === itemKey) : undefined;
  const trail: Crumb[] = [{ label: t.admin.title, href: '/admin' }];
  if (section) trail.push({ label: section.label, href: `/admin/${section.key}` });
  if (condition) trail.push({ label: condition.name[lang] || condition.name.en });
  return (
    <MotionRoot>
      <main className="page grid gap-8">
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
          {section && (
            <nav aria-label={t.admin.sections} className="max-w-full overflow-x-auto pb-1">
              <ul className="flex w-max gap-1.5">
                {sections.map((item) => (
                  <li key={item.key}>
                    <a href={`/admin/${item.key}`} onClick={onLink} aria-current={item.key === section.key ? 'page' : undefined} className="press inline-flex h-9 items-center gap-1.5 rounded-full border bg-card/70 px-3.5 text-footnote font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground">
                      <item.Glyph size={15} /> {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        {!section && <Overview sections={sections} />}
        {section?.key === 'conditions' && !condition && (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {conditions.map((item) => (
              <li key={item.slug}>
                <a href={`/admin/conditions/${item.slug}`} onClick={onLink} className="surface flex items-center gap-3 rounded-[22px] p-4">
                  <i className="size-3 shrink-0 rounded-full" style={{ background: item.color }} />
                  <strong className="flex-1 truncate">{item.name[lang] || item.name.en}</strong>
                  <span className="text-caption text-muted-foreground">{item.active ? t.admin.on : t.admin.off}</span>
                  <ArrowRight size={16} className="text-faint-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {condition && (
          <>
            <ConditionSettings key={condition.slug} admin={admin} condition={condition} />
            <MediaLibrary admin={admin} condition={condition} />
            <RuleTable admin={admin} condition={condition} />
          </>
        )}
        {section?.key === 'foods' && <NewFood admin={admin} />}
        {section?.key === 'accounts' && <Accounts admin={admin} tiers={tiers} />}
        {section?.key === 'tiers' && tiers.length > 0 && <TiersEditor admin={admin} tiers={tiers} onSaved={loadTiers} />}
        {section?.key === 'payments' && <Payments admin={admin} />}
        {section?.key === 'gateways' && <Gateways admin={admin} />}
        {section?.key === 'medicines' && <Medicines admin={admin} />}
        {section?.key === 'modes' && <DietModes admin={admin} />}
        {section?.key === 'recipes' && <ContentTable admin={admin} kind="recipes" />}
        {section?.key === 'posts' && <ContentTable admin={admin} kind="posts" />}
        {sectionKey && !section && <p className="surface-soft rounded-xl p-6 text-callout">{t.admin.notFound}</p>}
      </main>
    </MotionRoot>
  );
}
