// Right after sign-up the account page is a short guided run: your details, your medicines, your plan. This is its progress: three
// dots joined by a line that fills as the reader moves on, the current one named.
import { Check } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function WelcomeSteps({ step }: { step: 0 | 1 | 2 }) {
  const { t, num } = useI18n();
  const names = [t.journey.welcomeSteps.details, t.journey.welcomeSteps.medicines, t.journey.welcomeSteps.plan];
  return (
    <nav aria-label={t.journey.welcomeStep.replace('{n}', num(step + 1)).replace('{total}', num(3))} className="welcome-steps">
      <ol className="grid grid-cols-3 gap-2">
        {names.map((name, index) => {
          const done = index < step;
          const now = index === step;
          return (
            <li key={name} aria-current={now ? 'step' : undefined} className="grid gap-2">
              <span aria-hidden className="welcome-bar h-1.5 overflow-hidden rounded-full bg-border">
                <span className={cn('block h-full rounded-full bg-primary transition-[width] duration-700 ease-[var(--ease-liquid)]', done ? 'w-full' : now ? 'w-1/2' : 'w-0')} />
              </span>
              <span className={cn('flex items-center gap-1.5 text-footnote font-semibold', now ? 'text-foreground' : 'text-muted-foreground')}>
                <span className={cn('grid size-5 place-items-center rounded-full text-[11px] tabular-nums', done ? 'bg-recommended text-white' : now ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {done ? <Check size={11} strokeWidth={3} /> : num(index + 1)}
                </span>
                <span className="truncate">{name}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
