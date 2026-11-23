// "Linked with" on a food, condition or medicine page: what the thing connects to, as chips by kind with live counts and a list below,
// strictest first, a page at a time. Reads only GET /api/v1/links (the same call the mobile app makes). The words of every row are the
// server's, in the page's language, each with its source. Nothing shows while there is nothing linked or the call fails: it is an extra.
import { useState } from 'react';
import { ChevronDown } from '@/components/icons';
import { Hash } from '@/components/icons/page';
import { FilterChip } from '@/components/kit/filterchip';
import { Cite } from '@/components/links/Cite';
import { LinkBadge, endHref, useEndLabel } from '@/components/links/shared';
import { Button } from '@/components/ui/button';
import { useCursorList } from '@/lib/cursorlist';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { Link, LinkEnd, LinksPage } from '@/lib/types';

const PAGE = 12;

/** `from` is `kind:key`, such as `food:rice`. */
export function LinkedWith({ from }: { from: string }) {
  const { t, lang, num } = useI18n();
  const label = useEndLabel();
  const [kind, setKind] = useState<LinkEnd['kind'] | ''>('');
  const url = (cursor: string | null) => `/api/v1/links?from=${encodeURIComponent(from)}${kind ? `&to=${kind}` : ''}&lang=${lang}&limit=${PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const { first, items, more, busy, loadMore } = useCursorList<Link, LinksPage>(url, `${from}|${kind}|${lang}`);
  const counts = first?.counts ?? [];
  const everything = counts.reduce((sum, slot) => sum + slot.count, 0);
  if (!first || (everything === 0 && kind === '')) return null;
  return (
    <section aria-labelledby="linked-title" className="surface-soft grid gap-3 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="linked-title" className="flex items-center gap-2 text-callout font-semibold not-italic [font-family:var(--font-sans)]">
          <Hash size={18} className="text-muted-foreground" /> {t.links.title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold tabular-nums text-muted-foreground">{num(everything)}</span>
        </h2>
        <p className="text-footnote text-muted-foreground">{t.links.lead}</p>
      </div>
      <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.links.filter}>
        <FilterChip on={kind === ''} onClick={() => setKind('')} label={t.links.all} count={everything} />
        {counts.map((slot) => (
          <FilterChip key={slot.kind} on={kind === slot.kind} onClick={() => setKind(kind === slot.kind ? '' : slot.kind)} label={t.links.kinds[slot.kind]} count={slot.count} />
        ))}
      </div>
      <ul className="grid gap-2 md:grid-cols-2" aria-busy={busy}>
        {items.map((item) => {
          const href = endHref(item.other);
          const name = label(item.other);
          const reason = item.reason || (item.origin === 'allergen' ? t.links.allergenReason : '');
          return (
            <li key={item.id} className="grid min-w-0 content-start gap-1.5 rounded-xl border bg-card/70 p-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <LinkBadge verdict={item.verdict} />
                {href ? (
                  <a href={href} onClick={onLink} className="min-w-0 break-words text-subhead font-semibold hover:underline">{name}</a>
                ) : (
                  <span className="min-w-0 break-words text-subhead font-semibold">{name}</span>
                )}
                {kind === '' && <span className="text-caption text-muted-foreground">{t.links.kinds[item.other.kind]}</span>}
              </p>
              {item.other.hint && <p className="text-caption text-muted-foreground">{item.other.hint}</p>}
              {reason && <p className="text-footnote leading-snug">{reason}</p>}
              <Cite source={item.source} />
              {item.merged > 0 && <p className="text-caption text-muted-foreground">{t.links.merged.replace('{n}', num(item.merged))}</p>}
            </li>
          );
        })}
      </ul>
      {more && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" icon={ChevronDown} state={busy ? 'busy' : 'idle'} onClick={loadMore}>
            {t.links.more}
          </Button>
          <span className="text-footnote text-muted-foreground">{t.links.showing.replace('{n}', num(items.length)).replace('{total}', num(first.total))}</span>
        </div>
      )}
    </section>
  );
}
