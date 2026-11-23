// A select whose choices live in the database: opening it loads the first page from the server, typing searches on the server (after a
// short pause), and scrolling to the end of the list asks for the next page by cursor. So a food picker over thousands of rows never
// holds them all. `kind` names the list (foods, conditions, medicines, tiers); `value` is a slug. The chosen label is kept, and
// fetched on its own when the value arrives from outside (an edit form) and is not on the loaded page.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from '@/components/icons';
import { Check } from '@/components/icons/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { OptionDto, OptionsPageDto } from '@/lib/types';
import { send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = {
  kind: 'foods' | 'conditions' | 'medicines' | 'tiers';
  value: string;
  onChange: (value: string, option: OptionDto | null) => void;
  token?: string | undefined;
  id?: string | undefined;
  placeholder?: string | undefined;
  /** an extra first choice with an empty value, such as "All conditions" */
  emptyLabel?: string | undefined;
  className?: string | undefined;
  'aria-label'?: string | undefined;
};

const PAGE = 20;

export function RemoteSelect({ kind, value, onChange, token, id, placeholder, emptyLabel, className, ...rest }: Props) {
  const { t, lang, num } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<OptionDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState<OptionDto | null>(null);
  const run = useRef(0);
  const list = useRef<HTMLUListElement>(null);
  const base = `/api/v1/admin/options/${kind}`;

  const fetchPage = useCallback(
    async (text: string, from: string | null) => {
      const ticket = ++run.current;
      setLoading(true);
      try {
        const page = await send<OptionsPageDto>(`${base}?lang=${lang}&limit=${PAGE}&q=${encodeURIComponent(text)}${from ? `&cursor=${from}` : ''}`, 'GET', undefined, token);
        if (ticket !== run.current) return;
        setItems((now) => (from ? [...now, ...page.items] : page.items));
        setCursor(page.next_cursor);
        setTotal(page.total);
      } catch {
        if (ticket === run.current) setCursor(null);
      } finally {
        if (ticket === run.current) setLoading(false);
      }
    },
    [base, lang, token],
  );

  // a value that came from outside: learn its label once
  useEffect(() => {
    if (!value) {
      setChosen(null);
      return;
    }
    if (chosen?.value === value) return;
    void send<OptionsPageDto>(`${base}?lang=${lang}&value=${encodeURIComponent(value)}`, 'GET', undefined, token)
      .then((page) => setChosen(page.items[0] ?? null))
      .catch(() => undefined);
  }, [value, base, lang, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // opening resets the search; typing re-queries after a pause
  useEffect(() => {
    if (!open) return;
    setActive(0);
    const wait = window.setTimeout(() => void fetchPage(query.trim(), null), query ? 250 : 0);
    return () => window.clearTimeout(wait);
  }, [open, query, fetchPage]);
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const more = () => {
    if (cursor && !loading) void fetchPage(query.trim(), cursor);
  };
  const onScroll = () => {
    const box = list.current;
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 80) more();
  };
  const rows: (OptionDto | null)[] = emptyLabel && !query.trim() ? [null, ...items] : items;
  const pick = (option: OptionDto | null) => {
    setChosen(option);
    onChange(option?.value ?? '', option);
    setOpen(false);
  };
  const key = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') setActive((now) => Math.min(rows.length - 1, now + 1));
    else if (event.key === 'ArrowUp') setActive((now) => Math.max(0, now - 1));
    else if (event.key === 'Enter' && rows.length > 0) pick(rows[active] ?? null);
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    if (open && active >= rows.length - 3) more();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = chosen?.label ?? (value === '' ? emptyLabel : undefined);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger id={id} aria-label={rest['aria-label']} aria-haspopup="listbox" className={cn('field press flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-3.5 text-start text-subhead', className)}>
        <span className={cn('min-w-0 flex-1 truncate', !label && 'text-faint-foreground')}>{label ?? placeholder ?? '—'}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-[max(var(--radix-popover-trigger-width),16rem)] gap-1 p-1.5" onKeyDown={key}>
        <label className="flex h-10 items-center gap-2 rounded-xl border bg-background/60 px-3">
          <Search size={15} className="text-muted-foreground" />
          <span className="sr-only">{t.table.find}</span>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.table.find} className="min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
        </label>
        <ul ref={list} role="listbox" aria-label={rest['aria-label']} data-lenis-prevent onScroll={onScroll} className="grid max-h-72 gap-0.5 overflow-y-auto overscroll-contain">
          {rows.length === 0 && !loading && <li className="px-3 py-3 text-footnote text-muted-foreground">{t.table.noRows}</li>}
          {rows.map((option, index) => {
            const on = (option?.value ?? '') === value;
            return (
              <li key={option?.value ?? '__empty'} role="option" aria-selected={on} data-active={index === active} onPointerEnter={() => setActive(index)} onClick={() => pick(option)} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-subhead transition-colors', index === active && 'bg-accent', on && 'font-semibold')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option?.label ?? emptyLabel}</span>
                  {option?.hint && <span className="block truncate text-footnote font-normal text-muted-foreground">{option.hint}</span>}
                </span>
                {on && <Check size={15} strokeWidth={2.6} className="shrink-0 text-primary" />}
              </li>
            );
          })}
          {loading && (
            <li aria-hidden className="grid gap-1 px-3 py-2">
              <span className="shimmer h-4 w-3/5 rounded bg-muted" />
              <span className="shimmer h-3 w-2/5 rounded bg-muted" />
            </li>
          )}
        </ul>
        {total > 0 && (
          <p className="px-3 pb-1 pt-0.5 text-caption text-faint-foreground" aria-live="polite">
            {num(items.length)} / {num(total)}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
