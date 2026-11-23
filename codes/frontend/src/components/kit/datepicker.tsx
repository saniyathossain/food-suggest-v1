// Date pickers that replace the browser's own date box: a frosted trigger that reads the date in the reader's language and digits, a glass popover
// with the month grid (components/kit/calendar.tsx), and quick choices. `DatePicker` picks one day; `DateRangePicker` picks a from and a to (first
// click the start, second click the end, with presets for the last week, the last month and this month). Values are plain YYYY-MM-DD strings, as
// the API takes them; empty string = none.
import { useState } from 'react';
import { Calendar, iso, parse } from '@/components/kit/calendar';
import { CalendarDays } from '@/components/icons';
import { Close } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { digits, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function useWords() {
  const { lang } = useI18n();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  return (value: string, long = false): string =>
    value === '' ? '' : digits(parse(value).toLocaleDateString(locale, long ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' }), lang);
}

const trigger = 'field press flex h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3.5 text-start text-callout';

export function DatePicker({ value, onChange, min, max, id, label, placeholder, clearable = false, className }: { value: string; onChange: (value: string) => void; min?: string | undefined; max?: string | undefined; id?: string | undefined; label: string; placeholder?: string | undefined; clearable?: boolean; className?: string | undefined }) {
  const { t } = useI18n();
  const words = useWords();
  const [open, setOpen] = useState(false);
  const pick = (day: string) => {
    onChange(day);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger id={id} aria-label={label} className={cn(trigger, className)}>
        <CalendarDays size={18} className="shrink-0 text-muted-foreground" />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-faint-foreground')}>{value ? words(value) : placeholder ?? t.date.pick}</span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={0}
            aria-label={t.date.clear}
            onClick={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onChange('');
            }}
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <Close size={14} />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <Calendar from={value} min={min} max={max} onPick={pick} />
        <div className="flex items-center justify-between gap-2 border-t px-1 pt-2">
          <button type="button" onClick={() => pick(iso(new Date()))} disabled={Boolean(max && iso(new Date()) > max)} className="press h-8 rounded-full px-3 text-footnote font-semibold text-primary hover:bg-primary-soft disabled:opacity-40">
            {t.date.today}
          </button>
          {clearable && (
            <button type="button" onClick={() => pick('')} className="press h-8 rounded-full px-3 text-footnote font-semibold text-muted-foreground hover:bg-accent">
              {t.date.clear}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type Range = { from: string; to: string };

export function DateRangePicker({ value, onChange, min, max, label, className }: { value: Range; onChange: (value: Range) => void; min?: string | undefined; max?: string | undefined; label: string; className?: string | undefined }) {
  const { t } = useI18n();
  const words = useWords();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const now = new Date();
  const back = (days: number): Range => ({ from: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)), to: iso(now) });
  const presets: { label: string; range: Range }[] = [
    { label: t.date.last7, range: back(6) },
    { label: t.date.last30, range: back(29) },
    { label: t.date.thisMonth, range: { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) } },
  ];
  const finish = (range: Range) => {
    onChange(range);
    setStart('');
    setOpen(false);
  };
  const pick = (day: string) => {
    if (!start) {
      setStart(day);
      return;
    }
    finish(day < start ? { from: day, to: start } : { from: start, to: day });
  };
  const text = value.from && value.to ? `${words(value.from)} – ${words(value.to)}` : t.date.pickRange;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setStart('');
      }}
    >
      <PopoverTrigger aria-label={label} className={cn(trigger, 'w-auto min-w-[15rem]', className)}>
        <CalendarDays size={18} className="shrink-0 text-muted-foreground" />
        <span className={cn('min-w-0 flex-1 truncate', !(value.from && value.to) && 'text-faint-foreground')}>{text}</span>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <div className="flex flex-wrap gap-1.5 px-1 pb-2">
          {presets.map((preset) => (
            <button key={preset.label} type="button" onClick={() => finish(preset.range)} className="chip press !min-h-0 !px-3 !py-1 text-footnote">
              {preset.label}
            </button>
          ))}
        </div>
        <Calendar from={start || value.from} to={start ? '' : value.to} min={min} max={max} onPick={pick} />
        <p className="px-2 pb-1 text-caption text-muted-foreground">{start ? t.date.pickEnd : t.date.pickStart}</p>
      </PopoverContent>
    </Popover>
  );
}
