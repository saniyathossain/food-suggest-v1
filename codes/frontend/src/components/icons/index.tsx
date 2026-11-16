// Every icon Pathya shows, from one place (Shell Console's icon system): Hugeicons (free, stroke rounded) and Iconly (its softer line
// for the everyday glyphs), with AnimateIcons' moving twins for the navigation and actions. Nothing imports an icon package directly.
// Split by weight, so the first paint carries only what it draws:
//   index.tsx — the glyphs the top bar, Today's hero and builder, toasts and the outage screen use (first bundle);
//   page.tsx  — the glyphs only lazy pages use (lands in their chunks);
//   names.tsx — the names stored in the database (conditions, habits, food groups, meals, verdicts), loaded after first paint;
//               <Icon>, <CategoryIcon>, <MealIcon>, <VerdictIcon> below hold a same-size blank until it arrives.
import { useEffect, useState } from 'react';
import {
  Alert02Icon, BodyWeightIcon, BookOpen01Icon, UserIcon, Calendar03Icon, Cancel01Icon, ChevronDownIcon, Home01Icon, Key01Icon, LayoutGridIcon, Loading03Icon, Menu01Icon, MonitorIcon, Moon02Icon, Refresh01Icon, RestaurantIcon, Search01Icon, SparklesIcon, Sun01Icon,
} from '@hugeicons/core-free-icons';
import { animated } from '@/components/icons/animated';
import { STROKE, icon } from '@/components/icons/make';
import type { Verdict } from '@/lib/types';

export { STROKE, icon, type AppIcon, type IconProps } from '@/components/icons/make';

export const Home = /* @__PURE__ */ animated(Home01Icon, 'Home', () => import('@animateicons/react/huge/home-0-1-icon').then((loaded) => loaded.Home01Icon), STROKE);
export const CalendarDays = /* @__PURE__ */ animated(Calendar03Icon, 'CalendarDays', () => import('@animateicons/react/huge/calendar-0-1-icon').then((loaded) => loaded.Calendar01Icon), STROKE);
export const Search = /* @__PURE__ */ animated(Search01Icon, 'Search', () => import('@animateicons/react/huge/search-icon').then((loaded) => loaded.SearchIcon), STROKE);
export const LayoutGrid = /* @__PURE__ */ animated(LayoutGridIcon, 'LayoutGrid', () => import('@animateicons/react/huge/layout-grid-icon').then((loaded) => loaded.LayoutGridIcon), STROKE);
export const KeyRound = /* @__PURE__ */ animated(Key01Icon, 'KeyRound', () => import('@animateicons/react/huge/key-0-1-icon').then((loaded) => loaded.Key01Icon), STROKE);
export const Menu = /* @__PURE__ */ animated(Menu01Icon, 'Menu', () => import('@animateicons/react/huge/menu-0-1-icon').then((loaded) => loaded.Menu01Icon), STROKE);
export const Sun = /* @__PURE__ */ animated(Sun01Icon, 'Sun', () => import('@animateicons/react/huge/sun-0-1-icon').then((loaded) => loaded.Sun01Icon), STROKE);
export const Moon = /* @__PURE__ */ animated(Moon02Icon, 'Moon', () => import('@animateicons/react/huge/moon-0-1-icon').then((loaded) => loaded.Moon01Icon), STROKE);
export const RotateCw = /* @__PURE__ */ animated(Refresh01Icon, 'RotateCw', () => import('@animateicons/react/huge/refresh-0-1-icon').then((loaded) => loaded.Refresh01Icon), STROKE);
export const Sparkles = /* @__PURE__ */ animated(SparklesIcon, 'Sparkles', () => import('@animateicons/react/huge/sparkles-icon').then((loaded) => loaded.SparklesIcon), STROKE);
export const ChevronDown = /* @__PURE__ */ icon(ChevronDownIcon, 'ChevronDown');
export const Close = /* @__PURE__ */ icon(Cancel01Icon, 'Close');
export const Loader = /* @__PURE__ */ icon(Loading03Icon, 'Loader');
export const Monitor = /* @__PURE__ */ icon(MonitorIcon, 'Monitor');
export const Scale = /* @__PURE__ */ icon(BodyWeightIcon, 'Scale');
export const Utensils = /* @__PURE__ */ icon(RestaurantIcon, 'Utensils');
export const Book = /* @__PURE__ */ icon(BookOpen01Icon, 'Book');
export const UserRound = /* @__PURE__ */ icon(UserIcon, 'UserRound');
export const TriangleAlert = /* @__PURE__ */ icon(Alert02Icon, 'TriangleAlert');

type Names = typeof import('@/components/icons/names');
let names: Names | null = null;
let loading: Promise<Names> | null = null;

/** The database-name icons; asked for once, by whichever icon needs them first (or the idle preload). */
export function loadIconNames(): Promise<Names> {
  loading ??= import('@/components/icons/names').then((module) => (names = module));
  return loading;
}

function useNames(): Names | null {
  const [loaded, setLoaded] = useState(names);
  useEffect(() => {
    if (loaded) return;
    let live = true;
    void loadIconNames().then((module) => live && setLoaded(module));
    return () => {
      live = false;
    };
  }, [loaded]);
  return loaded;
}

type Sized = { size?: number; className?: string | undefined };

function Blank({ size }: { size: number }) {
  return <span aria-hidden className="inline-block shrink-0" style={{ width: size, height: size }} />;
}

export function Icon({ name, size = 20, className }: Sized & { name: string }) {
  const loaded = useNames();
  if (!loaded) return <Blank size={size} />;
  const Glyph = loaded.conditionIcon(name);
  return <Glyph size={size} {...(className ? { className } : {})} />;
}

export function CategoryIcon({ slug, size = 18, className }: Sized & { slug: string }) {
  const loaded = useNames();
  if (!loaded) return <Blank size={size} />;
  const Glyph = loaded.categoryIcon(slug);
  return <Glyph size={size} {...(className ? { className } : {})} />;
}

export function MealIcon({ slug, size = 18, className }: Sized & { slug: string }) {
  const loaded = useNames();
  if (!loaded) return <Blank size={size} />;
  const Glyph = loaded.mealIcon(slug);
  return <Glyph size={size} {...(className ? { className } : {})} />;
}

export function VerdictIcon({ verdict, size = 18, className }: Sized & { verdict: Verdict }) {
  const loaded = useNames();
  if (!loaded) return <Blank size={size} />;
  const Glyph = loaded.verdictIcon(verdict);
  return <Glyph size={size} strokeWidth={2} {...(className ? { className } : {})} />;
}

