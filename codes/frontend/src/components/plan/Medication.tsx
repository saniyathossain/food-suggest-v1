// The plan's medicine checks: medicines that need care together, foods and drinks to watch with each medicine (marking the
// ones in this plan), and how each is taken. Every line carries its source and the reminder to ask a doctor or pharmacist.
import { ExternalLink, Pill } from '@/components/icons/page';
import { TriangleAlert } from '@/components/icons';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { MedicationReport, Source } from '@/lib/types';
import { cn } from '@/lib/utils';

function Cite({ source }: { source: Source | null }) {
  if (!source?.url) return null;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption font-semibold text-primary">
      {source.publisher}: {source.title} <ExternalLink size={11} />
    </a>
  );
}

export function Medication({ report }: { report: MedicationReport }) {
  const { t } = useI18n();
  const nothing = report.drugs.length === 0 && report.foods.length === 0;
  return (
    <div className="grid gap-5">
      <p className="flex max-w-[70ch] items-start gap-2 rounded-xl bg-muted p-3.5 text-subhead">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-limit" /> {t.meds.checksLead}
      </p>
      {nothing && <p className="text-subhead text-muted-foreground">{t.meds.none}</p>}
      {report.drugs.length > 0 && (
        <section className="grid gap-2.5">
          <h3 className="text-headline">{t.meds.together}</h3>
          {report.drugs.map((row) => (
            <article key={`${row.first}-${row.second}`} className={cn('grid gap-1.5 rounded-2xl border p-4', row.severity === 'serious' ? 'border-avoid/40 bg-[color-mix(in_srgb,var(--avoid)_6%,var(--card))]' : 'bg-card')}>
              <p className="flex flex-wrap items-center gap-2 text-callout font-semibold">
                <Pill size={16} /> {row.first} + {row.second}
                <span className={cn('rounded-full px-2 py-0.5 text-caption', row.severity === 'serious' ? 'bg-avoid/15 text-avoid-ink' : 'bg-limit/15 text-limit-ink')}>{t.meds.severity[row.severity]}</span>
              </p>
              <p className="text-subhead text-muted-foreground">{row.reason}</p>
              <Cite source={row.source} />
            </article>
          ))}
        </section>
      )}
      {report.foods.length > 0 && (
        <section className="grid gap-2.5">
          <h3 className="text-headline">{t.meds.withFood}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {report.foods.map((row) => (
              <article key={`${row.medicine}-${row.item}`} className={cn('grid content-start gap-1.5 rounded-2xl border p-4', row.severity === 'serious' ? 'border-avoid/40' : '', 'bg-card')}>
                <p className="flex flex-wrap items-center gap-2 text-subhead font-semibold">
                  {row.medicine} · {row.item}
                  <span className={cn('rounded-full px-2 py-0.5 text-caption', row.severity === 'serious' ? 'bg-avoid/15 text-avoid-ink' : 'bg-limit/15 text-limit-ink')}>{t.meds.severity[row.severity]}</span>
                </p>
                <p className="text-subhead text-muted-foreground">{row.advice}</p>
                {row.foods.length > 0 && (
                  <p className="flex flex-wrap gap-1.5">
                    {row.foods.map(([slug, name]) => (
                      <a key={slug} href={`/food/${slug}`} onClick={onLink} className={cn('rounded-full px-2 py-0.5 text-caption font-semibold', row.in_plan.includes(name) ? 'bg-limit/15 text-limit-ink' : 'bg-muted')}>
                        {name}
                        {row.in_plan.includes(name) && ` · ${t.meds.inPlan}`}
                      </a>
                    ))}
                  </p>
                )}
                <Cite source={row.source} />
              </article>
            ))}
          </div>
        </section>
      )}
      {report.timing.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-headline">{t.meds.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {report.timing.map((row) => (
              <li key={row.medicine} className="grid gap-1 rounded-xl bg-muted p-3 text-subhead">
                <strong>
                  {row.medicine} · {t.meds.foodOptions[row.food_timing]}
                </strong>
                {row.how_to_take && <span className="text-muted-foreground">{row.how_to_take}</span>}
                <Cite source={row.source} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
