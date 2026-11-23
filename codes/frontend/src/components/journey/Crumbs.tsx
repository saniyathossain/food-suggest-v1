// Where am I, and the way back. One trail for every deep page (a condition, a food, a recipe, an article, pricing): a glass-edged back
// pill that names the place it returns to, and on wider screens the full trail (Today / Foods / Banana) with the current page last.
// Back goes where the reader came from when that was inside the app, otherwise up to the parent (a shared link has no history).
import { ArrowLeft, ChevronRight } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import { goBack, onLink } from '@/lib/router';

export interface Crumb {
  href: string;
  label: string;
}

export function Crumbs({ trail, here }: { trail: Crumb[]; here?: string | undefined }) {
  const { t } = useI18n();
  const all = trail[0]?.href === '/' ? trail : [{ href: '/', label: t.nav.today }, ...trail];
  const parent = all[all.length - 1] ?? { href: '/', label: t.nav.today };
  const back = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    goBack(parent.href);
  };
  return (
    <nav aria-label={t.journey.trail} className="no-print mb-4 flex min-w-0 items-center gap-3">
      <a
        href={parent.href}
        onClick={back}
        className="crumb-back press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full pl-2.5 pr-4 text-subhead font-semibold text-foreground"
      >
        <ArrowLeft size={17} />
        <span className="sr-only">{t.journey.backTo} </span>
        {parent.label}
      </a>
      <ol className="hidden min-w-0 items-center gap-1 text-footnote text-muted-foreground md:flex">
        {all.map((crumb) => (
          <li key={crumb.href} className="flex shrink-0 items-center gap-1">
            <a href={crumb.href} onClick={onLink} className="rounded-md px-1 py-0.5 transition-colors hover:text-foreground">
              {crumb.label}
            </a>
            <ChevronRight size={13} aria-hidden />
          </li>
        ))}
        {here && (
          <li aria-current="page" className="min-w-0 truncate font-semibold text-foreground">
            {here}
          </li>
        )}
      </ol>
    </nav>
  );
}
