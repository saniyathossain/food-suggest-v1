// The month grid behind the date pickers: weekday heads in the reader's language (Saturday first in Bangla, as the week is in Bangladesh, Monday
// in English), digits in the reader's script, today ringed, the chosen day (or range) tinted, days outside min/max dimmed and unclickable.
// Keyboard: arrows move by a day or a week, PageUp/PageDown by a month, Home/End to the week's ends, Enter picks. A roving tab stop keeps it one Tab
// stop for the whole grid. Pure view: the pickers own the value.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight } from '@/components/icons/page';
import { digits, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const iso = (day: Date): string => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
export const parse = (value: string): Date => {
  const [year = 1970, month = 1, date = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, date);
};
const add = (day: Date, days: number): Date => new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);

type Props = {
  /** the chosen day, or the start of a range */
  from: string;
  /** the end of a range (empty in single-day mode or while the end is still to be picked) */
  to?: string;
  min?: string | undefined;
  max?: string | undefined;
  onPick: (day: string) => void;
};

export function Calendar({ from, to = '', min, max, onPick }: Props) {
  const { t, lang } = useI18n();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  const first = lang === 'bn' ? 6 : 1; // 0 Sunday … 6 Saturday
  const anchor = from ? parse(from) : new Date();
  const [month, setMonth] = useState(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const [focus, setFocus] = useState(from || iso(new Date()));
  const grid = useRef<HTMLDivElement>(null);
  const todayIso = iso(new Date());
  useEffect(() => {
    // after a key move the focused day may sit in another month: show it, and put the browser focus on it
    const day = parse(focus);
    if (day.getMonth() !== month.getMonth() || day.getFullYear() !== month.getFullYear()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  const lead = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() - first + 7) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => add(new Date(month.getFullYear(), month.getMonth(), 1), index - lead));
  const heads = Array.from({ length: 7 }, (_, index) => new Date(2023, 0, 1 + ((first + index) % 7)).toLocaleDateString(locale, { weekday: 'narrow' }));
  const blocked = (day: string) => Boolean((min && day < min) || (max && day > max));
  const move = (days: number) => {
    const next = iso(add(parse(focus), days));
    if (!blocked(next)) setFocus(next);
  };
  const key = (event: React.KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in steps) move(steps[event.key] ?? 0);
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const day = parse(focus);
      setFocus(iso(new Date(day.getFullYear(), day.getMonth() + (event.key === 'PageUp' ? -1 : 1), day.getDate())));
    } else if (event.key === 'Home') move(-((parse(focus).getDay() - first + 7) % 7));
    else if (event.key === 'End') move(6 - ((parse(focus).getDay() - first + 7) % 7));
    else return;
    event.preventDefault();
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus());
  };
  const step = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const arrow = 'press grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';
  return (
    <div className="grid w-[19rem] max-w-full gap-2 p-1" onKeyDown={key}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} aria-label={t.date.prev} className={arrow}>
          <ArrowLeft size={17} />
        </button>
        <p aria-live="polite" className="text-subhead font-bold">
          {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).replace(/\d+/g, (value) => digits(value, lang))}
        </p>
        <button type="button" onClick={() => step(1)} aria-label={t.date.next} className={arrow}>
          <ChevronRight size={17} />
        </button>
      </div>
      <div ref={grid} role="grid" className="grid grid-cols-7 gap-y-0.5">
        {heads.map((head, index) => (
          <span key={index} aria-hidden className="grid h-8 place-items-center text-caption font-semibold text-muted-foreground">
            {head}
          </span>
        ))}
        {cells.map((day) => {
          const value = iso(day);
          const outside = day.getMonth() !== month.getMonth();
          const edge = value === from || value === to;
          const inside = Boolean(from && to && value > from && value < to);
          return (
            <span key={value} className={cn('grid place-items-center', inside && 'bg-primary/12', value === from && to && 'rounded-s-full bg-primary/12', value === to && 'rounded-e-full bg-primary/12')}>
              <button
                type="button"
                role="gridcell"
                tabIndex={value === focus ? 0 : -1}
                disabled={blocked(value)}
                aria-selected={edge || undefined}
                aria-current={value === todayIso ? 'date' : undefined}
                onClick={() => onPick(value)}
                className={cn(
                  'press grid size-9 place-items-center rounded-full text-subhead font-semibold tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-30',
                  outside && !edge && 'text-faint-foreground',
                  edge ? 'bg-primary text-primary-foreground shadow-[var(--lift-sm)]' : 'hover:bg-accent',
                  value === todayIso && !edge && 'ring-1 ring-inset ring-primary/50',
                )}
              >
                {digits(String(day.getDate()), lang)}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
