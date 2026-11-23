// The baby foods' feeding stages, shown above the list when the Baby & toddler group is chosen: four age bands (birth, about 6 months,
// 9 months, 12 months and over) with what the NHS and WHO say for each (milk only, then purées, then lumpy and finger foods, then
// family foods) and the number of meals. Choosing a band keeps only the foods that suit that age (each food's own age_from_months).
// Every line is general guidance from the pages named under it; a doctor or health worker knows the baby.
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import { cn } from '@/lib/utils';

export const STAGE_AGES = [0, 6, 9, 12] as const;
const KEYS = ['birth', 'six', 'nine', 'twelve'] as const;

export function BabyStages({ age, onPick }: { age: number | null; onPick: (age: number | null) => void }) {
  const { t, num } = useI18n();
  return (
    <section aria-labelledby="baby-stages" className="surface grid gap-4 rounded-[28px] p-5 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 id="baby-stages" className="text-title-3 font-bold not-italic [font-family:var(--font-sans)]">
            {t.baby.stagesTitle}
          </h2>
          <p className="max-w-[60ch] text-footnote text-muted-foreground">{t.baby.stagesLead}</p>
        </div>
        {age !== null && (
          <button type="button" onClick={() => onPick(null)} className="press h-8 rounded-full border px-3 text-footnote font-semibold hover:bg-accent">
            {t.baby.showAll}
          </button>
        )}
      </header>
      <ol className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {KEYS.map((key, index) => {
          const stage = t.baby.stages[key];
          const from = STAGE_AGES[index] ?? 0;
          const on = age === from;
          return (
            <li key={key}>
              <button type="button" aria-pressed={on} onClick={() => onPick(on ? null : from)} className={cn('chip press !grid h-full w-full !min-h-0 content-start justify-items-start gap-1.5 !rounded-2xl !p-3.5 text-start !whitespace-normal', on && 'chip-on-card')}>
                <span className="flex items-center gap-2 text-footnote font-bold text-primary">
                  <span className="grid size-6 place-items-center rounded-full bg-primary-soft tabular-nums">{num(index + 1)}</span>
                  {stage.age}
                </span>
                <strong className="text-subhead leading-snug">{stage.title}</strong>
                <span className="text-footnote font-medium text-muted-foreground">{stage.lead}</span>
                <span className="mt-auto pt-1 text-caption font-semibold text-foreground/70">{stage.meals}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-caption text-muted-foreground">
        {t.baby.sources}{' '}
        <a href="/read/starting-solid-foods" onClick={onLink} className="font-semibold text-primary hover:underline">
          {t.baby.readMore}
        </a>
      </p>
    </section>
  );
}
