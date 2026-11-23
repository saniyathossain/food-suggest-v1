// The select that replaces the browser's: a frosted trigger showing the chosen label with a chevron, a glass popover with the options (each
// a roomy row with a check on the chosen one), and a search box from five options up, as select2 and shadcn's combobox do. A closed list
// of fewer than five options is not a menu at all: it renders as chips (a radio group), the house rule for small enums. `as="menu"` keeps
// the dropdown where chips would not fit, such as a table cell.
// Drop-in for the native element: it takes the same <option> children and the same `value` / `onChange(event.target.value)` / `id` /
// `aria-label` / `disabled` / `className` (the class styles the trigger), so every existing call site keeps working.
// Keyboard: Enter or the arrow keys open it; arrows move, Enter picks, Esc closes, typing in the box filters.
import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import { ChevronDown } from '@/components/icons';
import { Check } from '@/components/icons/page';
import { Search } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Option = { value: string; label: ReactNode; text: string; disabled: boolean };

function collect(children: ReactNode, into: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>;
    if (element.type === Fragment) {
      collect(element.props.children, into);
      return;
    }
    const label = element.props.children;
    const text = Children.toArray(label).map((part) => (typeof part === 'string' || typeof part === 'number' ? String(part) : '')).join('');
    into.push({ value: String(element.props.value ?? text), label, text, disabled: Boolean(element.props.disabled) });
  });
  return into;
}

type Props = {
  value?: string | number | undefined;
  onChange?: ((event: ChangeEvent<HTMLSelectElement>) => void) | undefined;
  children?: ReactNode;
  id?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  'aria-label'?: string | undefined;
  searchable?: boolean | undefined;
  as?: 'auto' | 'menu' | undefined;
};

export const CHIP_LIMIT = 5;

export function Select({ value, onChange, children, id, className, disabled, searchable, as = 'auto', ...rest }: Props) {
  const { t } = useI18n();
  const options = useMemo(() => collect(children), [children]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const current = options.find((option) => option.value === String(value ?? ''));
  const searching = searchable ?? options.length >= CHIP_LIMIT;
  const shown = query.trim() ? options.filter((option) => option.text.toLowerCase().includes(query.trim().toLowerCase())) : options;
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(0, options.findIndex((option) => option.value === String(value ?? ''))));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  const pick = (option: Option | undefined) => {
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value } } as unknown as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };
  const key = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') setActive((now) => Math.min(shown.length - 1, now + 1));
    else if (event.key === 'ArrowUp') setActive((now) => Math.max(0, now - 1));
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(shown.length - 1);
    else if (event.key === 'Enter') pick(shown[active]);
    else return;
    event.preventDefault();
  };
  if (as === 'auto' && options.length > 0 && options.length < CHIP_LIMIT) {
    return (
      <div id={id} role="radiogroup" aria-label={rest['aria-label']} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const chosen = option.value === String(value ?? '');
          return (
            <button key={option.value} type="button" role="radio" aria-checked={chosen} disabled={disabled || option.disabled} onClick={() => pick(option)} className={cn('chip press', chosen && 'chip-on')}>
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={rest['aria-label']}
        aria-haspopup="listbox"
        className={cn('field press flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-3.5 text-start text-subhead disabled:cursor-not-allowed disabled:opacity-50', className)}
      >
        <span className={cn('min-w-0 flex-1 truncate', !current && 'text-faint-foreground')}>{current?.label ?? '—'}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-[max(var(--radix-popover-trigger-width),12rem)] gap-1 p-1.5" onKeyDown={key}>
        {searching && (
          <label className="flex h-10 items-center gap-2 rounded-xl border bg-background/60 px-3">
            <Search size={15} className="text-muted-foreground" />
            <span className="sr-only">{t.table.search}</span>
            <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder={t.table.search} className="min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
          </label>
        )}
        <ul ref={list} role="listbox" aria-label={rest['aria-label']} data-lenis-prevent className="grid max-h-72 gap-0.5 overflow-y-auto overscroll-contain">
          {shown.length === 0 && <li className="px-3 py-3 text-footnote text-muted-foreground">{t.table.noRows}</li>}
          {shown.map((option, index) => {
            const chosen = option.value === String(value ?? '');
            return (
              <li key={option.value} role="option" aria-selected={chosen} data-active={index === active} onPointerEnter={() => setActive(index)} onClick={() => pick(option)} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-subhead transition-colors', index === active && 'bg-accent', chosen && 'font-semibold', option.disabled && 'pointer-events-none opacity-45')}>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {chosen && <Check size={15} strokeWidth={2.6} className="shrink-0 text-primary" />}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
