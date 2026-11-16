// The four verdicts, drawn one way everywhere: a chip in the verdict's colour (badge), its fill colour for meters and lane edges.
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type { Verdict } from '@/lib/types';

export const VERDICTS: Verdict[] = ['avoid', 'limit', 'ok', 'recommended'];

export const verdictColor: Record<Verdict, string> = {
  avoid: 'var(--avoid)',
  limit: 'var(--limit)',
  ok: 'var(--ok)',
  recommended: 'var(--recommended)',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { t } = useI18n();
  return <Badge variant={verdict}>{t.verdict[verdict]}</Badge>;
}

/** A thin bar split by how many foods have each verdict. */
export function VerdictMeter({ counts, className }: { counts: Record<Verdict, number>; className?: string | undefined }) {
  const total = VERDICTS.reduce((sum, verdict) => sum + counts[verdict], 0) || 1;
  return (
    <div aria-hidden className={`flex h-1.5 gap-0.5 overflow-hidden rounded-full ${className ?? ''}`}>
      {VERDICTS.map((verdict) => (
        <span key={verdict} className="rounded-full" style={{ flex: counts[verdict] / total, background: verdictColor[verdict] }} />
      ))}
    </div>
  );
}
