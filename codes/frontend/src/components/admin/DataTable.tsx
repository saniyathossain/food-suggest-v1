// The admin's data table, one component for every list: a search box, filters from the caller, click-to-sort headers (Shift keeps the order
// stable), a column chooser, page size and numbered pages, a row count, CSV export of what is filtered, and a card layout on a phone (columns
// marked `hideBelow` fold away). Sorting, searching and paging run in the browser over the rows it is given, which suits a few hundred rows;
// a list that can grow past that pages on the server (the audit trail, accounts) and keeps using its own table until it moves here.
import { Select } from '@/components/ui/select';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, ChevronRight, ArrowLeft } from '@/components/icons/page';
import { Search } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type Column<Row> = {
  key: string;
  label: string;
  cell: (row: Row) => ReactNode;
  /** a comparison makes the header clickable */
  sort?: (first: Row, second: Row) => number;
  /** the text the CSV carries for this column (omit to leave the column out) */
  text?: (row: Row) => string | number;
  align?: 'end';
  /** fold the column away below this screen width */
  hideBelow?: 'sm' | 'md' | 'lg';
};

const HIDE = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden' } as const;

type Props<Row> = {
  label: string;
  rows: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  /** the words a row is found by (lower-case); without it the search box is hidden */
  searchText?: (row: Row) => string;
  filters?: ReactNode;
  empty: ReactNode;
  pageSizes?: number[];
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  exportName?: string;
  /** a list the server pages and searches (accounts, payments, the audit trail): the rows are the current page; the table shows the server's
      total and page, hands search words and page changes back, and sorts only the rows on screen */
  /** a row opens something (a detail panel): the row becomes clickable and reachable by keyboard */
  onRow?: (row: Row) => void;
  server?: { total: number; page: number; perPage: number; onPage: (page: number) => void; query: string; onQuery: (query: string) => void; loading?: boolean; /** the table lets the reader choose the page size and hands it back */ onPerPage?: (size: number) => void };
};

function pagesFor(page: number, last: number): (number | 'gap')[] {
  const keep = new Set([0, last, page - 1, page, page + 1].filter((value) => value >= 0 && value <= last));
  const ordered = [...keep].sort((first, second) => first - second);
  return ordered.flatMap((value, index) => (index > 0 && value - (ordered[index - 1] ?? 0) > 1 ? ['gap' as const, value] : [value]));
}

const csv = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

export function DataTable<Row>({ label, rows, columns, rowKey, searchText, filters, empty, pageSizes = [10, 25, 50, 100], initialSort, exportName, server, onRow }: Props<Row>) {
  const { t, num } = useI18n();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const [size, setSize] = useState(pageSizes[1] ?? 25);
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => (!server && needle && searchText ? rows.filter((row) => searchText(row).includes(needle)) : rows), [rows, needle, searchText, server]);
  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sort?.key);
    if (!column?.sort || !sort) return filtered;
    const compare = column.sort;
    return [...filtered].sort((first, second) => (sort.dir === 'asc' ? compare(first, second) : compare(second, first)));
  }, [filtered, columns, sort]);
  const total = server ? server.total : sorted.length;
  const perPage = server ? server.perPage : size;
  const last = Math.max(0, Math.ceil(total / perPage) - 1);
  const at = server ? Math.min(server.page, last) : Math.min(page, last);
  const go = (next: number) => (server ? server.onPage(next) : setPage(next));
  const visible = server ? sorted : sorted.slice(at * size, at * size + size);
  const shown = columns.filter((column) => !hidden.includes(column.key));
  const header = (column: Column<Row>) => {
    if (!column.sort) return column.label;
    const on = sort?.key === column.key;
    return (
      <button type="button" onClick={() => setSort(on && sort?.dir === 'asc' ? { key: column.key, dir: 'desc' } : { key: column.key, dir: 'asc' })} className={cn('press inline-flex items-center gap-1 font-bold', on && 'text-foreground')} aria-sort={on ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        {column.label}
        <ArrowUpDown size={13} className={on ? 'text-primary' : 'text-faint-foreground'} />
      </button>
    );
  };
  const download = () => {
    const exported = columns.filter((column) => column.text);
    const lines = [exported.map((column) => csv(column.label)).join(','), ...sorted.map((row) => exported.map((column) => csv(column.text?.(row) ?? '')).join(','))];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    link.download = `${exportName ?? 'table'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const tool = 'press inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-subhead font-semibold hover:bg-accent';
  return (
    <section aria-label={label} className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {(searchText || server) && (
          <label className="field flex h-10 min-w-[14rem] flex-1 items-center gap-2 rounded-full px-4">
            <Search size={17} className="text-muted-foreground" />
            <span className="sr-only">{t.table.search}</span>
            <input type="search" value={server ? server.query : query} onChange={(event) => { if (server) { server.onQuery(event.target.value); server.onPage(0); } else { setQuery(event.target.value); setPage(0); } }} placeholder={t.table.search} className="min-w-0 flex-1 bg-transparent text-subhead outline-none placeholder:text-faint-foreground" />
          </label>
        )}
        <Popover>
          <PopoverTrigger className={tool}>{t.table.columns}</PopoverTrigger>
          <PopoverContent className="grid w-56 gap-0.5 p-2">
            {columns.map((column) => (
              <label key={column.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-subhead hover:bg-accent">
                <input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => setHidden((now) => (now.includes(column.key) ? now.filter((item) => item !== column.key) : [...now, column.key]))} className="size-4 accent-[var(--primary)]" />
                {column.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {columns.some((column) => column.text) && (
          <button type="button" onClick={download} className={tool}>
            {t.table.export}
          </button>
        )}
      </div>
      {filters}
      <div className={cn('table-frame overflow-x-auto rounded-2xl border bg-card transition-opacity', server?.loading && 'opacity-60')}>
        <table className="data-table w-full text-left text-subhead">
          <thead>
            <tr>
              {shown.map((column) => (
                <th key={column.key} scope="col" className={cn('whitespace-nowrap text-footnote text-muted-foreground', column.align === 'end' && 'text-end', column.hideBelow && HIDE[column.hideBelow])}>
                  {header(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)} {...(onRow ? { tabIndex: 0, onClick: () => onRow(row), onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'Enter') onRow(row); }, className: 'cursor-pointer focus-visible:bg-accent' } : {})}>
                {shown.map((column) => (
                  <td key={column.key} className={cn(column.align === 'end' && 'text-end tabular-nums', column.hideBelow && HIDE[column.hideBelow])}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && !server?.loading && <div className="p-6">{empty}</div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-footnote text-muted-foreground">
        <p aria-live="polite">{t.table.rows.replace('{from}', num(total === 0 ? 0 : at * perPage + 1)).replace('{to}', num(Math.min(total, at * perPage + perPage))).replace('{total}', num(total))}</p>
        <div className="flex flex-wrap items-center gap-3">
          {(!server || server.onPerPage) && <label className="flex items-center gap-2">
            {t.table.perPage}
            <Select value={server ? server.perPage : size} onChange={(event) => { const next = Number(event.target.value); if (server) { server.onPerPage?.(next); server.onPage(0); } else { setSize(next); setPage(0); } }} className="field h-9 rounded-full px-3 text-footnote font-semibold">
              {pageSizes.map((item) => (
                <option key={item} value={item}>{num(item)}</option>
              ))}
            </Select>
          </label>}
          <nav aria-label={t.table.pages} className="flex items-center gap-1">
            <button type="button" disabled={at === 0} onClick={() => go(at - 1)} aria-label={t.date.prev} className="press grid size-9 place-items-center rounded-full hover:bg-accent disabled:opacity-35"><ArrowLeft size={16} /></button>
            {pagesFor(at, last).map((item, index) =>
              item === 'gap' ? (
                <span key={`gap-${index}`} aria-hidden className="px-1">…</span>
              ) : (
                <button key={item} type="button" aria-current={item === at ? 'page' : undefined} onClick={() => go(item)} className={cn('press grid h-9 min-w-9 place-items-center rounded-full px-2 font-semibold tabular-nums', item === at ? 'bg-ink text-ink-foreground' : 'hover:bg-accent')}>
                  {num(item + 1)}
                </button>
              ),
            )}
            <button type="button" disabled={at === last} onClick={() => go(at + 1)} aria-label={t.date.next} className="press grid size-9 place-items-center rounded-full hover:bg-accent disabled:opacity-35"><ChevronRight size={16} /></button>
          </nav>
        </div>
      </div>
    </section>
  );
}
