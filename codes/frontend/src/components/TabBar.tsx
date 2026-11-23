// The phone tab bar (CarePulse / Zest): a floating white bar at the bottom with five places, icon over label; the current one sits
// in a black pill. More opens the same sheet as the top bar's menu (every link, conditions, language, theme). Hidden from 1024 px,
// where the top bar carries the links.
import { CalendarDays, Home, LayoutGrid, Search, Utensils, type AppIcon } from '@/components/icons';
import { useI18n } from '@/lib/i18n';
import { LiquidPill, useLiquid } from '@/components/kit/liquid';
import { onLink, usePath } from '@/lib/router';
import { sectionOf } from '@/lib/section';
import { cn } from '@/lib/utils';

const item = 'ios-tab press grid min-w-0 flex-1 cursor-pointer justify-items-center gap-0.5 rounded-2xl px-1 pb-1 pt-1.5 text-[10.5px] font-semibold leading-none text-foreground/60 transition-colors';

function Tab({ href, label, Glyph, current }: { href: string; label: string; Glyph: AppIcon; current: boolean }) {
  return (
    <a href={href} onClick={onLink} aria-current={current ? 'page' : undefined} className={cn(item, current && 'text-primary')}>
      <span data-bead className={cn('grid h-8 w-14 place-items-center rounded-full transition-colors duration-300', current && 'text-primary')}>
        <Glyph size={24} />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </a>
  );
}

export function TabBar() {
  const { t } = useI18n();
  const path = usePath();
  const section = sectionOf(path);
  const liquid = useLiquid<HTMLDivElement>(section, '[aria-current="page"] [data-bead]');
  const tabs = [
    { href: '/', label: t.nav.today, Glyph: Home },
    { href: '/plan', label: t.nav.plan, Glyph: CalendarDays },
    { href: '/foods', label: t.nav.foods, Glyph: Search },
    { href: '/recipes', label: t.nav.recipes, Glyph: Utensils },
  ];
  return (
    <nav data-chrome aria-label={t.nav.main} className="tabbar fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] lg:hidden">
      <div ref={liquid.host} className="liquid-host glass glass-dense mx-auto flex max-w-md items-stretch gap-0.5 rounded-[26px] p-1.5">
        <LiquidPill pill={liquid.pill} />
        {tabs.map((tab) => (
          <Tab key={tab.href} {...tab} current={section === tab.href} />
        ))}
        <button type="button" data-menu-toggle onClick={() => window.dispatchEvent(new Event('menu:toggle'))} className={item}>
          <span className="grid h-8 w-12 place-items-center rounded-full">
            <LayoutGrid size={24} />
          </span>
          <span className="max-w-full truncate">{t.nav.more}</span>
        </button>
      </div>
    </nav>
  );
}
