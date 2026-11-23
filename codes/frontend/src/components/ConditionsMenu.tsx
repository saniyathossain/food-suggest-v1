// The Conditions menu (Radix dropdown via the kit's ui/dropdown-menu): roving focus, typeahead, Esc, ARIA. Non-modal, so it writes
// no <style> element (strict CSP). Lives in its own chunk, loaded right after first paint.
import { ChevronDown, Icon, LayoutGrid } from '@/components/icons';
import { navItem } from '@/components/MenuBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { endpoints, prefetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { navigate, usePath } from '@/lib/router';
import type { Bootstrap } from '@/lib/types';
import { tone } from '@/lib/utils';

export default function ConditionsMenu({ boot }: { boot: Bootstrap | undefined }) {
  const { t, lang } = useI18n();
  const path = usePath();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={navItem} aria-current={path.startsWith('/condition/') ? 'page' : undefined}>
        <LayoutGrid size={18} className="max-2xl:hidden" /> {t.nav.conditions} <ChevronDown size={15} className="transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={14} align="start" className="min-w-72">
        {boot?.conditions.map((condition) => (
          <DropdownMenuItem
            key={condition.slug}
            className="gap-3 data-[current]:bg-muted [&_svg]:size-auto"
            data-current={path === `/condition/${condition.slug}` ? '' : undefined}
            onFocus={() => prefetch(endpoints.condition(condition.slug, lang))}
            onSelect={() => navigate(`/condition/${condition.slug}`)}
          >
            <span className="tile size-8 rounded-md" style={tone(condition.color)}>
              <Icon name={condition.icon} size={17} />
            </span>
            {condition.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
