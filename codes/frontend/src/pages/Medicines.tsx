// The medicine library: every generic medicine by name or group, with how it is taken, how many food notes and medicine conflicts it has.
// Search, group chips (several at once, each with a live count), when-to-take chips, a sort, and a cursor-paged grid that loads the next page as
// you scroll. Filters are remembered on the device. General information with a pharmacist-first message; it never suggests a dose.
import { useDeferredValue, useEffect, useRef } from 'react';
import { Search } from '@/components/icons';
import { Pill } from '@/components/icons/page';
import { EmptyState } from '@/components/journey/EmptyState';
import { FilterChip } from '@/components/kit/filterchip';
import { ErrorBox } from '@/components/kit/loaderror';
import { SortSelect } from '@/components/kit/sortselect';
import { Disclaimer } from '@/components/Sources';
import { useCursorList } from '@/lib/cursorlist';
import { toggle } from '@/lib/foodfilters';
import { useI18n, useT } from '@/lib/i18n';
import { usePersisted } from '@/lib/persisted';
import { onLink } from '@/lib/router';
import type { FoodTiming, MedicineCard, MedicinePage } from '@/lib/types';
import { cn } from '@/lib/utils';

const TIMINGS: FoodTiming[] = ['empty_stomach', 'before_food', 'with_food', 'after_food', 'any'];
type Sort = 'az' | 'za' | 'conflicts' | 'food_notes' | 'drug_conflicts' | 'group' | 'timing';
const SORTS: Sort[] = ['az', 'za', 'conflicts', 'food_notes', 'drug_conflicts', 'group', 'timing'];
const SORT_LABEL = { az: 'az', za: 'za', conflicts: 'conflicts', food_notes: 'foodNotes', drug_conflicts: 'drugConflicts', group: 'group', timing: 'timing' } as const;
const TONES = ['var(--tone-sky)', 'var(--river)', 'var(--aubergine)', 'var(--coral)', 'var(--saffron)', 'var(--leaf)', 'var(--tone-rose)', 'var(--tone-iris)'];
const toneOf = (slug: string): string => TONES[[...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length] ?? TONES[0] ?? 'var(--primary)';

export function MedicineCardView({ item }: { item: MedicineCard }) {
  const { t, num } = useI18n();
  return (
    <a href={`/medicines/${item.slug}`} onClick={onLink} className="surface group grid content-start gap-3 rounded-[26px] p-5">
      <div className="flex items-start gap-3">
        {item.image ? (
          <img src={`${item.image}?w=96`} alt="" loading="lazy" className="size-11 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="tile size-11 rounded-2xl" style={{ ['--tone' as string]: toneOf(item.group_slug) }}>
            <Pill size={20} />
          </span>
        )}
        <div className="grid min-w-0 gap-0.5">
          <strong className="truncate text-callout leading-tight transition-colors group-hover:text-primary">{item.name}</strong>
          <span className="truncate text-footnote text-muted-foreground">{item.group}</span>
        </div>
      </div>
      <p className="line-clamp-2 min-h-[2.6em] text-footnote text-muted-foreground">{item.how_to_take || t.library.noLabel}</p>
      <p className="flex flex-wrap gap-1.5 text-caption font-semibold">
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-primary">{t.meds.foodOptions[item.food_timing]}</span>
        {item.food_notes > 0 && <span className="rounded-full bg-[var(--tint-butter)] px-2.5 py-1 text-[var(--tint-ink)]">{t.library.foodNotes.replace('{n}', num(item.food_notes))}</span>}
        {item.drug_conflicts > 0 && <span className="rounded-full bg-[var(--tint-blush)] px-2.5 py-1 text-[var(--tint-ink)]">{t.library.drugConflicts.replace('{n}', num(item.drug_conflicts))}</span>}
      </p>
    </a>
  );
}

export default function Medicines() {
  const { t, lang } = useI18n();
  const translate = useT();
  const [query, setQuery] = usePersisted('pathya.meds.q', '');
  const [groups, setGroups] = usePersisted<string[]>('pathya.meds.groups', []);
  const [timings, setTimings] = usePersisted<FoodTiming[]>('pathya.meds.timings', []);
  const [sort, setSort] = usePersisted<Sort>('pathya.meds.sort', 'az');
  const needle = useDeferredValue(query.trim());
  const key = `${lang}|${needle}|${groups.join()}|${timings.join()}|${sort}`;
  const params = `&q=${encodeURIComponent(needle)}&group=${groups.join()}&timing=${timings.join()}&sort=${sort}&limit=24`;
  const list = useCursorList<MedicineCard, MedicinePage>((cursor) => `/api/v1/library/medicines?lang=${lang}${params}${cursor ? `&cursor=${cursor}` : ''}`, key);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !list.more || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && list.loadMore(), { rootMargin: '700px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [list.more, list.items.length, list.loadMore]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = Number(needle !== '') + groups.length + timings.length;
  const reset = () => {
    setQuery('');
    setGroups([]);
    setTimings([]);
  };
  const facets = list.first?.groups ?? [];
  return (
    <main className="page grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-large-title">{t.library.title}</h1>
        <p className="max-w-[62ch] text-callout text-muted-foreground">{t.library.lead}</p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <label className="field flex h-12 min-w-[16rem] flex-1 items-center gap-3 rounded-full px-5">
          <Search size={20} className="text-muted-foreground" />
          <span className="sr-only">{t.library.title}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.library.search} className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-faint-foreground" />
        </label>
        <SortSelect label={t.list.sort} value={sort} onChange={setSort} options={SORTS.map((item) => ({ value: item, label: item === 'conflicts' ? t.library.mostNotes : t.list.sorts[SORT_LABEL[item]] }))} />
      </div>
      <div className="grid gap-2">
        <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.library.when}>
          {TIMINGS.map((value) => (
            <FilterChip key={value} on={timings.includes(value)} onClick={() => setTimings(toggle(timings, value) as FoodTiming[])} label={t.meds.foodOptions[value]} count={list.first?.timings.find((item) => item.value === value)?.count} />
          ))}
        </div>
        {facets.length > 0 && (
          <div className="rail gap-2 pb-1 sm:flex-wrap" role="group" aria-label={t.library.groups}>
            {facets.map((group) => (
              <FilterChip key={group.slug} on={groups.includes(group.slug)} onClick={() => setGroups(toggle(groups, group.slug))} label={group.name} count={group.count} color={toneOf(group.slug)} />
            ))}
          </div>
        )}
      </div>
      {active > 0 && (
        <p className="flex flex-wrap items-center gap-3 text-footnote text-muted-foreground">
          <span aria-live="polite">{translate('list.filtersOn', active)}</span>
          <button type="button" onClick={reset} className="press inline-flex h-8 items-center rounded-full border px-3 font-semibold text-foreground hover:bg-accent">
            {t.list.reset}
          </button>
        </p>
      )}
      {list.error && <ErrorBox />}
      {list.first && <p aria-live="polite" className="text-footnote text-muted-foreground">{t.list.results.replace('{n}', String(list.first.total))}</p>}
      {list.first && list.items.length === 0 && <EmptyState icon={Pill} title={t.library.emptyTitle} lead={t.library.emptyLead} primary={{ label: t.list.reset, onClick: reset }} />}
      {!list.first && !list.error && (
        <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="shimmer block h-44 rounded-[26px]" />
          ))}
        </div>
      )}
      {list.items.length > 0 && (
        <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-6', list.busy && 'opacity-80')}>
          {list.items.map((item) => (
            <MedicineCardView key={item.slug} item={item} />
          ))}
        </div>
      )}
      <div ref={sentinel} aria-hidden className="h-px" />
      <Disclaimer />
    </main>
  );
}
