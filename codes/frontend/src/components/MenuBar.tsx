// The floating top bar: one row of liquid glass on every screen size (no bottom dock; on a phone the links fold into a sheet that drops
// from the bar). Brand, the main links, the Conditions menu (Radix, its own chunk, loaded after first paint), Spotlight, the clock,
// language and theme.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Book, CalendarDays, ChevronDown, Home, KeyRound, LayoutGrid, Menu, Close, Scale, Search, UserRound, Utensils, type AppIcon } from '@/components/icons';
import { LiquidPill, useLiquid } from '@/components/kit/liquid';
import { PreferenceButtons } from '@/components/Preferences';
import { iconButtonClass } from '@/components/ui/button-styles';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { onLink, usePath } from '@/lib/router';
import type { Bootstrap } from '@/lib/types';
import { cn } from '@/lib/utils';

const ConditionsMenu = lazy(() => import('@/components/ConditionsMenu'));
const MenuSheet = lazy(() => import('@/components/MenuSheet').then((module) => ({ default: module.MenuSheet })));

export interface NavLink {
  href: string;
  label: string;
  Glyph: AppIcon;
}

export function useLinks(): NavLink[] {
  const { t } = useI18n();
  return [
    { href: '/', label: t.nav.today, Glyph: Home },
    { href: '/plan', label: t.nav.plan, Glyph: CalendarDays },
    { href: '/foods', label: t.nav.foods, Glyph: Search },
    { href: '/recipes', label: t.nav.recipes, Glyph: Utensils },
    { href: '/read', label: t.nav.read, Glyph: Book },
    { href: '/tools/bmi', label: t.nav.bmi, Glyph: Scale },
  ];
}

export const navItem =
  'nav-link press inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 text-subhead font-medium text-foreground/72 [&_svg]:opacity-85';

/** Static twin of the Radix menu trigger, shown until the menu's chunk arrives (keeps Radix off the first paint). */
export function ConditionsTrigger() {
  const { t } = useI18n();
  return (
    <button type="button" className={navItem}>
      <LayoutGrid size={17} /> {t.nav.conditions} <ChevronDown size={14} />
    </button>
  );
}

function openSpotlight() {
  window.dispatchEvent(new Event('spotlight:open'));
}

export function MenuBar({ boot }: { boot: Bootstrap | undefined }) {
  const { t } = useI18n();
  const path = usePath();
  const links = useLinks();
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const liquid = useLiquid<HTMLElement>(path);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  // the phone tab bar's More button opens the same sheet
  useEffect(() => {
    const toggle = () => setOpen((now) => !now);
    window.addEventListener('menu:toggle', toggle);
    return () => window.removeEventListener('menu:toggle', toggle);
  }, []);
  return (
    <header data-chrome className="gutter sticky top-0 z-40 pt-[calc(10px+env(safe-area-inset-top))]">
      <div className="glass flex h-[60px] min-w-0 items-center gap-2 rounded-2xl pl-3.5 pr-2">
        <a href="/" onClick={onLink} className="press flex shrink-0 items-center gap-2.5 rounded-full pr-1 text-title-3 font-extrabold tracking-tight">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <span>{t.app.name}</span>
        </a>
        <nav ref={liquid.host} aria-label={t.nav.main} className="nav-track liquid-host ml-3 hidden min-w-0 items-center gap-1 xl:flex">
          <LiquidPill pill={liquid.pill} />
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={onLink} className={navItem} aria-current={path === link.href ? 'page' : undefined}>
              <link.Glyph size={17} /> {link.label}
            </a>
          ))}
          <Suspense fallback={<ConditionsTrigger />}>
            <ConditionsMenu boot={boot} />
          </Suspense>
        </nav>
        <span className="flex-1" />
        <button type="button" onClick={openSpotlight} aria-label={t.spotlight.button} className="press flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card text-subhead text-muted-foreground transition-colors hover:bg-muted hover:text-foreground 2xl:px-3 2xl:pr-2">
          <Search size={18} />
          <span className="hidden 2xl:inline">{t.spotlight.button}</span>
          <kbd className="hidden rounded-md border bg-card px-1.5 text-caption font-semibold 2xl:inline">⌘K</kbd>
        </button>
        <PreferenceButtons className="max-xl:hidden" />
        {auth.me && ['super_admin', 'admin', 'editor'].includes(auth.me.role) && (
          <a href="/admin" onClick={onLink} aria-label={t.nav.admin} title={t.nav.admin} aria-current={path.startsWith('/admin') ? 'page' : undefined} className={cn(iconButtonClass('md', 'ghost'), 'max-xl:hidden aria-[current=page]:text-primary')}>
            <KeyRound size={19} />
          </a>
        )}
        {auth.status === 'in' ? (
          <a href="/account" onClick={onLink} aria-label={t.auth.account} title={auth.me?.name ?? t.auth.account} aria-current={path === '/account' ? 'page' : undefined} className="press flex shrink-0 items-center gap-2.5 rounded-full pr-1">
            <span className="grid size-10 place-items-center rounded-full bg-cta text-subhead font-bold text-cta-ink">
              {(auth.me?.name ?? '?').trim().charAt(0).toUpperCase() || <UserRound size={18} />}
            </span>
            <span className="hidden min-w-0 max-w-[140px] leading-tight 2xl:grid">
              <strong className="truncate text-subhead">{auth.me?.name}</strong>
              <span className="truncate text-caption text-muted-foreground">{auth.me?.email}</span>
            </span>
          </a>
        ) : (
          <a href={`/login?next=${encodeURIComponent(path)}`} onClick={onLink} className="press inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-cta px-4 text-subhead font-semibold text-cta-ink shadow-[var(--lift-sun-sm)] hover:bg-cta-hover">
            {t.auth.signIn}
          </a>
        )}
        <button type="button" className={cn(iconButtonClass('md', 'ghost'), 'max-lg:hidden xl:hidden')} aria-expanded={open} aria-controls="menu-sheet" aria-label={t.nav.menu} onClick={() => setOpen(!open)}>
          <span key={String(open)} className="swap-in grid">
            {open ? <Close size={21} /> : <Menu size={21} />}
          </span>
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <MenuSheet boot={boot} links={links} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </header>
  );
}
