// The admin breadcrumb, built from the address: Admin › Section › Item. Every step but the last is a link; the last is the page you
// are on (aria-current). Long names truncate on a phone; the trail scrolls sideways rather than wrapping.
import { ChevronRight } from '@/components/icons/page';
import { KeyRound } from '@/components/icons';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';

export type Crumb = { label: string; href?: string | undefined };

export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t.admin.breadcrumb} className="max-w-full overflow-x-auto">
      <ol className="flex w-max items-center gap-1 rounded-full border bg-card/70 px-1.5 py-1 text-footnote backdrop-blur-md">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight size={14} className="text-faint-foreground" aria-hidden />}
              {last || !crumb.href ? (
                <span aria-current={last ? 'page' : undefined} className="max-w-[220px] truncate rounded-full bg-ink px-3 py-1 font-semibold text-ink-foreground">
                  {crumb.label}
                </span>
              ) : (
                <a href={crumb.href} onClick={onLink} className="flex max-w-[180px] items-center gap-1.5 truncate rounded-full px-3 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {index === 0 && <KeyRound size={14} />}
                  {crumb.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
