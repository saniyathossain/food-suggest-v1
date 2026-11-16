// The phone and tablet menu: a glass sheet that drops from the top bar (opened by its button, or the tab bar's More). The links, every condition, language,
// theme and admin. Esc and a tap outside close it.
import { useEffect } from 'react';
import { Icon, KeyRound } from '@/components/icons';
import type { NavLink } from '@/components/MenuBar';
import { Sparkles, UserRound } from '@/components/icons';
import { Preferences } from '@/components/Preferences';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { onLink, usePath } from '@/lib/router';
import type { Bootstrap } from '@/lib/types';
import { tone } from '@/lib/utils';

const row = 'press flex min-h-12 items-center gap-3 rounded-lg px-3 text-callout font-semibold transition-colors nav-link';

export function MenuSheet({ boot, links, onClose }: { boot: Bootstrap | undefined; links: NavLink[]; onClose: () => void }) {
  const { t } = useI18n();
  const path = usePath();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const onDown = (event: PointerEvent) => {
      const inside = event.target instanceof Element && event.target.closest('#menu-sheet, [aria-controls="menu-sheet"], [data-menu-toggle]');
      if (!inside) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);
  const auth = useAuth();
  return (
    <div id="menu-sheet" role="dialog" aria-label={t.nav.menu} data-lenis-prevent className="glass glass-dense anim-drop mt-2 max-h-[calc(100dvh-96px-96px)] lg:max-h-[calc(100dvh-96px)] overflow-y-auto overscroll-contain rounded-2xl p-3 xl:hidden">
      <nav aria-label={t.nav.main} className="grid gap-1 sm:grid-cols-2">
        {links.map((link) => (
          <a key={link.href} href={link.href} onClick={onLink} className={row} aria-current={path === link.href ? 'page' : undefined}>
            <span className="grid size-9 place-items-center rounded-md bg-accent">
              <link.Glyph size={19} />
            </span>
            {link.label}
          </a>
        ))}
        <a href={auth.status === 'in' ? '/account' : '/login'} onClick={onLink} className={row} aria-current={path === '/account' ? 'page' : undefined}>
          <span className="grid size-9 place-items-center rounded-md bg-accent">
            <UserRound size={19} />
          </span>
          {auth.status === 'in' ? t.auth.account : t.auth.signIn}
        </a>
        <a href="/pricing" onClick={onLink} className={row} aria-current={path === '/pricing' ? 'page' : undefined}>
          <span className="grid size-9 place-items-center rounded-md bg-accent">
            <Sparkles size={19} />
          </span>
          {t.tiers.title}
        </a>
      </nav>
      <p className="mb-1 mt-4 px-3 text-footnote font-semibold text-muted-foreground">{t.nav.conditions}</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {boot?.conditions.map((condition) => (
          <a key={condition.slug} href={`/condition/${condition.slug}`} onClick={onLink} className={row} aria-current={path === `/condition/${condition.slug}` ? 'page' : undefined}>
            <span className="tile size-9 rounded-md" style={tone(condition.color)}>
              <Icon name={condition.icon} size={18} />
            </span>
            {condition.name}
          </a>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t px-1 pt-3">
        <Preferences />
        <a href="/admin" onClick={onLink} className="press inline-flex h-10 items-center gap-2 rounded-full px-3 text-subhead font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
          <KeyRound size={18} /> {t.nav.admin}
        </a>
      </div>
    </div>
  );
}
