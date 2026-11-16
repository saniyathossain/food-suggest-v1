// What Spotlight can find: pages, conditions and actions (instant, local), foods (from the API as you type, debounced and cached),
// and the last five things opened. Kept apart from the panel so each stays small.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, CategoryIcon, Home, Icon, KeyRound, LayoutGrid, Moon, Scale, Search, Sun } from '@/components/icons';
import { Languages } from '@/components/icons/page';
import { endpoints, getJson } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { navigate } from '@/lib/router';
import { switchLang, switchTheme } from '@/lib/switching';
import type { Bootstrap, FoodSearch } from '@/lib/types';

export interface Hit {
  id: string;
  group: string;
  label: string;
  hint?: string | undefined;
  icon: ReactNode;
  tone?: string | undefined;
  run: () => void;
}

const RECENT_KEY = 'pathya.spotlight';

export function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function remember(label: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([label, ...readRecent().filter((item) => item !== label)].slice(0, 5)));
  } catch {
    // private mode: nothing to remember
  }
}

const normal = (text: string) => text.normalize('NFC').toLowerCase();

function useFoodHits(query: string, open: boolean): FoodSearch[] {
  const { lang } = useI18n();
  const [foods, setFoods] = useState<FoodSearch[]>([]);
  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) {
      setFoods([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      getJson<FoodSearch[]>(endpoints.foods(lang, term, ''))
        .then((items) => live && setFoods(items.slice(0, 6)))
        .catch(() => live && setFoods([]));
    }, 140);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query, open, lang]);
  return foods;
}

export function useHits(boot: Bootstrap | undefined, query: string, open: boolean): Hit[] {
  const { t, lang } = useI18n();
  const { theme } = usePrefs();
  const foods = useFoodHits(query, open);
  return useMemo<Hit[]>(() => {
    const go = (path: string) => () => navigate(path);
    const pages: Hit[] = [
      { id: 'p-home', group: t.spotlight.pages, label: t.nav.today, icon: <Home size={19} />, run: go('/') },
      { id: 'p-plan', group: t.spotlight.pages, label: t.nav.plan, icon: <CalendarDays size={19} />, run: go('/plan') },
      { id: 'p-foods', group: t.spotlight.pages, label: t.nav.foods, icon: <Search size={19} />, run: go('/foods') },
      { id: 'p-bmi', group: t.spotlight.pages, label: t.bmi.title, icon: <Scale size={19} />, run: go('/tools/bmi') },
      { id: 'p-admin', group: t.spotlight.pages, label: t.nav.admin, icon: <KeyRound size={19} />, run: go('/admin') },
    ];
    const conditions: Hit[] = (boot?.conditions ?? []).map((condition) => ({
      id: `c-${condition.slug}`,
      group: t.nav.conditions,
      label: condition.name,
      hint: condition.summary,
      tone: condition.color,
      icon: <Icon name={condition.icon} size={18} />,
      run: go(`/condition/${condition.slug}`),
    }));
    const dark = theme === 'dark';
    const actions: Hit[] = [
      { id: 'a-lang', group: t.spotlight.actions, label: lang === 'en' ? 'বাংলায় দেখুন' : 'Switch to English', icon: <Languages size={19} />, run: () => switchLang(lang === 'en' ? 'bn' : 'en') },
      { id: 'a-theme', group: t.spotlight.actions, label: dark ? t.theme.light : t.theme.dark, icon: dark ? <Sun size={19} /> : <Moon size={19} />, run: () => switchTheme(dark ? 'light' : 'dark') },
      { id: 'a-build', group: t.spotlight.actions, label: t.home.build, icon: <LayoutGrid size={19} />, run: go('/plan') },
    ];
    const foodHits: Hit[] = foods.map((food) => ({
      id: `f-${food.slug}`,
      group: t.nav.foods,
      label: food.name,
      hint: boot?.categories.find((item) => item.slug === food.category)?.name,
      icon: <CategoryIcon slug={food.category} size={18} />,
      run: go(`/food/${food.slug}`),
    }));
    const term = normal(query.trim());
    const local = [...pages, ...conditions, ...actions].filter((hit) => !term || normal(hit.label).includes(term) || normal(hit.hint ?? '').includes(term));
    if (term) return [...local, ...foodHits];
    const recent = readRecent()
      .map((label) => [...pages, ...conditions].find((hit) => hit.label === label))
      .filter((hit): hit is Hit => hit !== undefined)
      .map((hit) => ({ ...hit, id: `r-${hit.id}`, group: t.spotlight.recent }));
    return [...recent, ...local];
  }, [boot, foods, query, t, lang, theme]);
}
