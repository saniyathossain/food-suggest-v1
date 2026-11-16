// Where the guidance on a page comes from. External links open in a new tab without leaking the page (noopener noreferrer).
import { BookOpen, ExternalLink, Info } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import type { Source } from '@/lib/types';

export function Sources({ items }: { items: Source[] }) {
  const { t, num } = useI18n();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="sources-title" className="surface-soft rounded-xl p-5 sm:p-6">
      <h2 id="sources-title" className="flex items-center gap-2.5 text-headline font-semibold">
        <BookOpen size={20} className="text-muted-foreground" /> {t.sources.title}
      </h2>
      <p className="mt-1 text-subhead text-muted-foreground">{t.sources.lead}</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((source) => (
          <li key={`${source.publisher}-${source.title}`} className="grid gap-0.5 text-subhead">
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-semibold text-primary">
                {source.title} <ExternalLink size={14} className="mt-1" />
              </a>
            ) : (
              <span className="font-semibold">{source.title}</span>
            )}
            <small className="text-footnote text-muted-foreground">
              {source.publisher}
              {source.year ? ` · ${num(source.year)}` : ''}
            </small>
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
