// What the links screens share: the words for an end (a food or condition names itself; an allergen or a criterion is worded from the
// language files), where an end opens, and a verdict drawn in its colour. Food verdicts and medicine severities use one badge.
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type { Allergen, LinkEnd, LinkVerdict } from '@/lib/types';

export const LINK_VERDICTS: LinkVerdict[] = ['serious', 'avoid', 'caution', 'limit', 'recommended', 'ok'];
export const LINK_KINDS: LinkEnd['kind'][] = ['food', 'condition', 'medicine', 'allergen', 'criterion'];

const TONE: Record<LinkVerdict, 'avoid' | 'limit' | 'ok' | 'recommended'> = { serious: 'avoid', avoid: 'avoid', caution: 'limit', limit: 'limit', recommended: 'recommended', ok: 'ok' };

export function LinkBadge({ verdict }: { verdict: LinkVerdict }) {
  const { t } = useI18n();
  return <Badge variant={TONE[verdict]}>{t.links.verdict[verdict]}</Badge>;
}

/** The words for one end, in the page's language. */
export function useEndLabel() {
  const { t } = useI18n();
  return (end: LinkEnd): string => {
    if (end.label) return end.label;
    const [head = '', tail = ''] = end.key.split(':');
    if (end.kind === 'allergen') return t.account.allergen[end.key as Allergen] ?? end.key;
    if (head === 'age') return t.links.age[tail as keyof typeof t.links.age] ?? end.key;
    if (head === 'sex') return t.links.sex[tail as keyof typeof t.links.sex] ?? end.key;
    if (head === 'pregnancy') return t.links.pregnancy[tail as keyof typeof t.links.pregnancy] ?? end.key;
    const reading = t.links.reading[head as keyof typeof t.links.reading];
    return reading ? `${reading} · ${t.links.band[tail as keyof typeof t.links.band] ?? tail}` : end.key;
  };
}

/** Where an end's own page is (an allergen or a criterion has none). */
export function endHref(end: LinkEnd): string | null {
  const key = encodeURIComponent(end.key);
  if (end.kind === 'food') return `/food/${key}`;
  if (end.kind === 'condition') return `/condition/${key}`;
  if (end.kind === 'medicine') return `/medicines/${key}`;
  return null;
}
