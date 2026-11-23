// Where the guidance on a page comes from. External links open in a new tab without leaking the page (noopener noreferrer).
import { useState } from 'react';
import { ChevronDown } from '@/components/icons';
import { BookOpen, ExternalLink, Info } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import type { Source } from '@/lib/types';

const SHOWN = 2;

/** Compact by default: the first two sources in one quiet row each; "Show all" opens the rest. */
export function Sources({ items }: { items: Source[] }) {
  const { t, num } = useI18n();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const more = items.length > SHOWN;
  const list = open || !more ? items : items.slice(0, SHOWN);
  return (
    <section aria-labelledby="sources-title" className="surface-soft rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sources-title" className="flex items-center gap-2 text-callout font-semibold not-italic [font-family:var(--font-sans)]">
          <BookOpen size={18} className="text-muted-foreground" /> {t.sources.title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground tabular-nums">{num(items.length)}</span>
        </h2>
        {more && (
          <button type="button" aria-expanded={open} aria-controls="sources-list" onClick={() => setOpen(!open)} className="press inline-flex h-8 items-center gap-1 rounded-full px-3 text-footnote font-semibold text-primary hover:bg-primary-soft">
            {open ? t.sources.showFewer : t.sources.showAll.replace('{n}', num(items.length))}
            <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        )}
      </div>
      <ol id="sources-list" className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {list.map((source) => (
          <li key={`${source.publisher}-${source.title}`} className="min-w-0 text-footnote leading-snug">
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1 font-semibold text-primary hover:underline">
                <span className="truncate">{source.title}</span> <ExternalLink size={12} className="mt-0.5 shrink-0" />
              </a>
            ) : (
              <span className="font-semibold">{source.title}</span>
            )}
            <span className="block truncate text-muted-foreground">
              {source.publisher}
              {source.year ? ` · ${num(source.year)}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Disclaimer() {
  const { t } = useI18n();
  return (
    <p className="flex gap-3 rounded-xl border border-dashed p-4 text-footnote text-muted-foreground">
      <Info size={18} className="shrink-0" />
      {t.disclaimer}
    </p>
  );
}
