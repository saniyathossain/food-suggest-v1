// The guided first run, on Today for a member whose set-up is not finished: four steps (account, about you, conditions, your first
// plan) with the current one lit and one button for it. It reads the account's own state (no profile yet → step 2, a profile without
// conditions → step 3, both → step 4 until the plan has been opened), and the reader can put it away.
import { useState } from 'react';
import { ArrowRight, Check } from '@/components/icons/page';
import { Beam } from '@/components/kit/beam';
import { buttonClass } from '@/components/ui/button-styles';
import { checklistHidden, hideChecklist, markPlanSeen, planSeen } from '@/lib/firstrun';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import type { PersonalPlan } from '@/lib/types';
import { cn } from '@/lib/utils';

type Step = { key: 'account' | 'about' | 'conditions' | 'plan'; done: boolean };

export function FirstRun({ plan, noProfile }: { plan: PersonalPlan | undefined; noProfile: boolean }) {
  const { t, num } = useI18n();
  const [hidden, setHidden] = useState(checklistHidden);
  const known = plan !== undefined || noProfile;
  if (!known || hidden) return null;
  const hasProfile = plan !== undefined;
  const hasConditions = (plan?.plan.profile.conditions.length ?? 0) > 0;
  const steps: Step[] = [
    { key: 'account', done: true },
    { key: 'about', done: hasProfile },
    { key: 'conditions', done: hasConditions },
    { key: 'plan', done: hasProfile && hasConditions && planSeen() },
  ];
  const current = steps.findIndex((step) => !step.done);
  if (current === -1) return null;
  const step = steps[current];
  if (!step) return null;
  const copy = t.journey.steps[step.key];
  const to = step.key === 'plan' ? '/plan' : '/welcome';
  const finished = steps.filter((item) => item.done).length;
  return (
    <Beam when="always" className="rounded-[30px]">
    <section aria-labelledby="first-run-title" className="first-run surface grid gap-5 rounded-[30px] p-5 sm:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="eyebrow">{t.journey.gettingStarted}</p>
          <h2 id="first-run-title" className="text-title-2 font-bold not-italic [font-family:var(--font-sans)]">
            {t.journey.firstTitle}
          </h2>
        </div>
        <p className="rounded-full bg-primary-soft px-3 py-1 text-footnote font-bold text-primary tabular-nums">
          {t.journey.progress.replace('{done}', num(finished)).replace('{total}', num(steps.length))}
        </p>
      </header>
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map((item, index) => {
          const now = index === current;
          return (
            <li
              key={item.key}
              aria-current={now ? 'step' : undefined}
              className={cn('first-run-step grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border p-3 transition-colors', now ? 'border-primary/40 bg-primary-soft' : 'border-border bg-muted/50', item.done && 'text-muted-foreground')}
            >
              <span className={cn('grid size-8 place-items-center rounded-full text-footnote font-bold tabular-nums', item.done ? 'bg-recommended text-white' : now ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground ring-1 ring-border')}>
                {item.done ? <Check size={15} strokeWidth={2.6} className="check-pop" /> : num(index + 1)}
              </span>
              <span className="min-w-0 truncate text-subhead font-semibold">{t.journey.steps[item.key].name}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="min-w-0 flex-1 basis-64 text-subhead text-muted-foreground">{copy.lead}</p>
        <div className="flex items-center gap-2">
          <a
            href={to}
            onClick={(event) => {
              if (step.key === 'plan') markPlanSeen();
              onLink(event);
            }}
            className={buttonClass('default', 'lg')}
          >
            {copy.action} <ArrowRight />
          </a>
          <button
            type="button"
            onClick={() => {
              hideChecklist();
              setHidden(true);
            }}
            className="press h-12 rounded-full px-4 text-subhead font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t.journey.later}
          </button>
        </div>
      </div>
    </section>
    </Beam>
  );
}
