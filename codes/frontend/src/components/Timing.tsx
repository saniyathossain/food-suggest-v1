// When to eat and when not to (a timeline of do / don't), and habits that help (a grid of small cards). Shared by a condition's page
// and the plan.
import { Close, Icon } from '@/components/icons';
import { Check, Fire } from '@/components/icons/page';
import { doneToday, habitKey, streakOf, toggleHabit, useHabitLog, weekOf } from '@/lib/habits';
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

/** Done today out of all, as a ring (transform-free SVG; the number is printed beside it). */
function DayRing({ done, total }: { done: number; total: number }) {
  const radius = 18;
  const length = 2 * Math.PI * radius;
  const share = total === 0 ? 0 : done / total;
  return (
    <svg viewBox="0 0 44 44" role="img" aria-label={`${done}/${total}`} className="size-11 shrink-0 -rotate-90">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--muted)" strokeWidth="5" />
      <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - share)} className="transition-[stroke-dashoffset] duration-500 ease-[var(--ease-out)]" />
    </svg>
  );
}

export function HabitGrid({ items }: { items: Habit[] }) {
  const { t, num } = useI18n();
  const log = useHabitLog();
  const keys = items.map((habit, index) => habitKey(habit.condition?.slug, habit.icon, index));
  const done = keys.filter((key) => doneToday(log, key)).length;
  const best = Math.max(0, ...keys.map((key) => streakOf(log, key)));
  return (
    <div className="grid gap-4">
      <div className="surface flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <DayRing done={done} total={items.length} />
        <div className="min-w-0 flex-1">
          <p className="text-headline">{done === items.length && items.length > 0 ? t.habitLog.allDone : t.habitLog.today.replace('{0}', num(done)).replace('{1}', num(items.length))}</p>
          <p className="text-subhead text-muted-foreground">{t.habitLog.lead}</p>
        </div>
        {best > 1 && <span className="chip chip-md"><Fire size={14} /> {t.habitLog.best.replace('{0}', num(best))}</span>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((habit, index) => {
          const key = keys[index] ?? '';
          const ticked = doneToday(log, key);
          const streak = streakOf(log, key);
          const week = weekOf(log, key);
          return (
            <li key={`${habit.title}-${index}`} className="surface grid content-start gap-3 rounded-2xl p-4">
              <div className="flex gap-4">
                <span className="tile size-11 shrink-0 rounded-xl" style={tone(habit.condition?.color ?? 'var(--aubergine)')}>
                  <Icon name={habit.icon} size={21} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-headline">{habit.title}</h3>
                  <p className="mt-1 text-subhead text-muted-foreground">{habit.detail}</p>
                  {habit.condition && (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-footnote font-semibold" style={tone(habit.condition.color)}>
                      <i className="dot" /> {habit.condition.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
                <span className="flex items-center gap-1" role="img" aria-label={t.habitLog.week.replace('{0}', num(week.filter(Boolean).length))}>
                  {week.map((on, day) => (
                    <i key={day} className={cn('size-2 rounded-full', on ? 'bg-[var(--brand)]' : 'bg-muted')} />
                  ))}
                  {streak > 1 && <span className="ms-1.5 text-footnote font-semibold tabular-nums text-muted-foreground">{t.habitLog.streak.replace('{0}', num(streak))}</span>}
                </span>
                <button
                  type="button"
                  aria-pressed={ticked}
                  onClick={() => toggleHabit(key)}
                  className="chip chip-md press"
                >
                  <Check size={14} strokeWidth={2.6} /> {ticked ? t.habitLog.done : t.habitLog.mark}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
