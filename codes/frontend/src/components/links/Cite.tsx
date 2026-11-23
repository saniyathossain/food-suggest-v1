// A source under a link row: publisher and title, opening the source in a new tab when it has an address.
import { ExternalLink } from '@/components/icons/page';
import type { Source } from '@/lib/types';

export function Cite({ source }: { source: Source | null }) {
  if (!source) return null;
  const text = `${source.publisher}: ${source.title}`;
  return (
    <p className="min-w-0 text-caption text-muted-foreground">
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1 font-semibold text-primary hover:underline">
          <span className="break-words">{text}</span> <ExternalLink size={12} className="mt-0.5 shrink-0" />
        </a>
      ) : (
        <span className="font-semibold">{text}</span>
      )}
    </p>
  );
}
