// A condition's own details above its food lists: what it is, then symptoms, causes and risks, and when to see a doctor side by side, and a
// plain warning box for the signs that need help now. The lines come from the API in the page's language (`details`); a part with no lines is
// left out, and with no details at all nothing shows. General information from the sources on the page, never a diagnosis.
import { Activity, CircleAlert, Info, Lightbulb, Stethoscope } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import type { DetailGroup, DetailKind } from '@/lib/types';

const GLYPH = { about: Info, symptoms: Activity, causes: Lightbulb, see_doctor: Stethoscope, urgent: CircleAlert } as const;
const TONE: Record<DetailKind, string> = { about: 'var(--primary)', symptoms: 'var(--river)', causes: 'var(--mango)', see_doctor: 'var(--limit)', urgent: 'var(--avoid)' };

function Part({ group, className }: { group: DetailGroup; className?: string }) {
  const { t } = useI18n();
  const Glyph = GLYPH[group.kind];
  return (
    <section aria-labelledby={`fact-${group.kind}`} className={`surface-soft grid content-start gap-2.5 rounded-xl p-4 ${className ?? ''}`} style={group.kind === 'urgent' ? { background: `color-mix(in srgb, ${TONE.urgent} 9%, var(--card))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${TONE.urgent} 28%, transparent)` } : undefined}>
      <h2 id={`fact-${group.kind}`} className="flex items-center gap-2 text-callout font-semibold not-italic [font-family:var(--font-sans)]">
        <Glyph size={18} style={{ color: TONE[group.kind] }} /> {t.conditionDetails.kinds[group.kind]}
      </h2>
      <ul className="grid gap-1.5 text-subhead leading-snug">
        {group.items.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full" style={{ background: TONE[group.kind] }} />
            <span className="min-w-0">{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ConditionFacts({ details }: { details: DetailGroup[] }) {
  const { t } = useI18n();
  if (details.length === 0) return null;
  const find = (kind: DetailKind) => details.find((group) => group.kind === kind);
  const about = find('about');
  const columns = (['symptoms', 'causes', 'see_doctor'] as const).map(find).filter((group): group is DetailGroup => group !== undefined);
  const urgent = find('urgent');
  return (
    <div className="grid gap-3">
      {about && (
        <div className="surface-soft flex gap-3 rounded-xl p-4 text-subhead leading-snug">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <p className="min-w-0 max-w-none">{about.items.join(' ')}</p>
        </div>
      )}
      {columns.length > 0 && (
        <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
          {columns.map((group) => (
            <Part key={group.kind} group={group} />
          ))}
        </div>
      )}
      {urgent && <Part group={urgent} />}
      <p className="text-footnote text-muted-foreground">{t.conditionDetails.note}</p>
    </div>
  );
}
