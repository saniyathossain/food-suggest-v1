// When to eat and when not to (a timeline of do / don't), and habits that help (a grid of small cards). Shared by a condition's page
// and the plan.
import { Close, Icon } from '@/components/icons';
import { Check } from '@/components/icons/page';
import { clock, useI18n } from '@/lib/i18n';
import type { Habit, Timing } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

export function TimingList({ items, showCondition = false }: { items: Timing[]; showCondition?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <ol className="relative grid gap-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-border">
      {items.map((item, index) => {
        const good = item.kind === 'do';
        return (
          <li key={`${item.title}-${index}`} className="relative grid grid-cols-[40px_1fr] gap-3">
            <span aria-label={t.timing[item.kind]} className={cn('z-10 grid size-10 place-items-center rounded-full text-white ring-4 ring-background', good ? 'bg-recommended' : 'bg-avoid')}>
              {good ? <Check size={18} strokeWidth={2.6} /> : <Close size={18} strokeWidth={2.6} />}
            </span>
            <div className="surface rounded-xl p-4">
              <p className="text-footnote font-semibold tabular-nums text-muted-foreground">{item.time ? clock(item.time, lang) : t.condition.anyTime}</p>
              <h3 className="mt-0.5 text-headline">{item.title}</h3>
              <p className="mt-1 text-subhead text-muted-foreground">{item.detail}</p>
              {showCondition && item.condition && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-footnote font-semibold" style={tone(item.condition.color)}>
                  <i className="dot" /> {item.condition.name}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function HabitGrid({ items }: { items: Habit[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((habit, index) => (
        <li key={`${habit.title}-${index}`} className="surface flex gap-4 rounded-xl p-4">
          <span className="tile size-11 rounded-lg" style={tone(habit.condition?.color ?? 'var(--aubergine)')}>
            <Icon name={habit.icon} size={21} />
          </span>
          <div className="min-w-0">
            <h3 className="text-headline">{habit.title}</h3>
            <p className="mt-1 text-subhead text-muted-foreground">{habit.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
