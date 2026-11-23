// More things the search (⌘K) can find: habits and medicine generics (from one small public index, fetched when the search opens and
// filtered here, so it stays fast and works offline once loaded), and, for staff only, the admin pages.
import { useEffect, useState } from 'react';
import { Icon, KeyRound } from '@/components/icons';
import { Pill } from '@/components/icons/page';
import type { Hit } from '@/components/spotlightHits';
import { endpoints, getJson } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import type { Habit, Role } from '@/lib/types';

interface SearchIndex {
  /** how far this tier reaches: 1 pages and foods, 2 adds conditions, habits, recipes, articles, 3 adds medicines (the server decides) */
  level: number;
  habits: Habit[];
  medicines: { slug: string; name: string; group: string }[];
}

const STAFF: Role[] = ['super_admin', 'admin', 'editor', 'medical_reviewer'];
const ADMIN_PAGES = ['conditions', 'coverage', 'rulesio', 'foods', 'accounts', 'tiers', 'payments', 'gateways', 'medicines', 'modes', 'recipes', 'posts', 'calendar', 'media', 'insights', 'audit'] as const;

function useSearchIndex(open: boolean): SearchIndex {
  const { lang } = useI18n();
  const { me } = useAuth();
  const [index, setIndex] = useState<SearchIndex>({ level: Math.max(1, me?.tier.features.find((item) => item.feature === 'spotlight')?.value ?? 1), habits: [], medicines: [] });
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    void getJson<SearchIndex>(endpoints.searchIndex(lang))
      .then((data) => live && setIndex(data))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, lang]);
  return index;
}

/** Habit, medicine and admin-page hits for a typed term (none for an empty term), and how far this tier's search reaches. */
export function useMoreHits(open: boolean, term: string, normal: (text: string) => string): { hits: Hit[]; level: number } {
  const { t } = useI18n();
  const { me } = useAuth();
  const index = useSearchIndex(open);
  const level = index.level < 0 ? 3 : index.level;
  if (!term) return { hits: [], level };
  const has = (...parts: (string | undefined)[]) => normal(parts.join(' ')).includes(term);
  const go = (path: string) => () => navigate(path);
  const habits: Hit[] = index.habits
    .filter((habit) => has(habit.title, habit.detail, habit.condition?.name))
    .slice(0, 4)
    .map((habit, position) => ({ id: `h-${position}-${habit.title}`, group: t.spotlight.habits, label: habit.title, hint: habit.condition?.name ?? habit.detail, icon: <Icon name={habit.icon} size={18} />, run: go(habit.condition ? `/condition/${habit.condition.slug}` : '/plan') }));
  const medicines: Hit[] = index.medicines
    .filter((item) => has(item.name, item.group))
    .slice(0, 4)
    .map((item) => ({ id: `m-${item.slug}`, group: t.spotlight.medicines, label: item.name, hint: item.group, icon: <Pill size={18} />, run: go('/account') }));
  const labels: Record<(typeof ADMIN_PAGES)[number], string> = {
    conditions: t.nav.conditions,
    coverage: t.admin.ops.sections.coverage,
    rulesio: t.admin.ops.sections.rulesio,
    foods: t.admin.newFood,
    accounts: t.admin.users,
    tiers: t.admin.tiersTitle,
    payments: t.admin.paymentsTitle,
    gateways: t.admin.gatewaysTitle,
    medicines: t.admin.medicinesTitle,
    modes: t.admin.modes,
    recipes: t.recipes.title,
    posts: t.blog.title,
    calendar: t.admin.ops.sections.calendar,
    media: t.admin.ops.sections.media,
    insights: t.admin.ops.sections.insights,
    audit: t.admin.ops.sections.audit,
  };
  const staff = me !== null && me !== undefined && STAFF.includes(me.role);
  const admin: Hit[] = staff
    ? ADMIN_PAGES.filter((page) => has(labels[page], page)).slice(0, 4).map((page) => ({ id: `ad-${page}`, group: t.spotlight.admin, label: labels[page], icon: <KeyRound size={18} />, run: go(`/admin/${page}`) }))
    : [];
  return { hits: [...habits, ...medicines, ...admin], level };
}
