// macOS-style Spotlight: ⌘K / Ctrl+K / "/" from anywhere. Pages, conditions and actions are instant; foods come from the API as you
// type. ↑ ↓ to move, Enter to open, Esc to close. A custom overlay (not Radix Dialog), so it writes no <style> element under the
// strict CSP; focus stays in the field (aria-activedescendant), the page behind is inert while it is open.
import { useEffect, useRef, useState } from 'react';
import { Search } from '@/components/icons';
import { CornerDownLeft } from '@/components/icons/page';
import { remember, useHits, type Hit } from '@/components/spotlightHits';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap } from '@/lib/types';
import { cn, tone } from '@/lib/utils';

function useInert(open: boolean) {
  useEffect(() => {
    const roots = [...document.querySelectorAll<HTMLElement>('#root > :not([data-spotlight])')];
    roots.forEach((node) => (node.inert = open));
    return () => roots.forEach((node) => (node.inert = false));
  }, [open]);
}

function HitRow({ hit, index, active, onHover, onChoose }: { hit: Hit; index: number; active: boolean; onHover: () => void; onChoose: () => void }) {
  return (
    <button
      type="button"
      id={`spot-${hit.id}`}
      role="option"
      aria-selected={active}
      data-index={index}
      onMouseMove={onHover}
      onClick={onChoose}
      className={cn('flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors', active ? 'bg-foreground text-background' : 'hover:bg-accent')}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-md', hit.tone ? 'tile' : active ? 'bg-white/20' : 'bg-accent')} style={hit.tone ? tone(hit.tone) : undefined}>
        {hit.icon}
      </span>
      <span className="grid min-w-0 flex-1">
        <strong className="truncate text-callout font-semibold">{hit.label}</strong>
        {hit.hint && <small className={cn('truncate text-footnote', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{hit.hint}</small>}
      </span>
      {active && <CornerDownLeft size={16} />}
    </button>
  );
}

export function Spotlight({ boot, onClose }: { boot: Bootstrap | undefined; onClose: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const hits = useHits(boot, query, true);
  useInert(true);
  useEffect(() => {
    setActive(0);
  }, [query]);
  // a block body: scrollIntoView returns a Promise in current Chrome, and an effect must return nothing or a cleanup function
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (hit: Hit | undefined) => {
    if (!hit) return;
    remember(hit.label);
    onClose();
    hit.run();
  };
  const keys: Record<string, () => void> = {
    ArrowDown: () => setActive((index) => Math.min(index + 1, hits.length - 1)),
    ArrowUp: () => setActive((index) => Math.max(index - 1, 0)),
    Enter: () => choose(hits[active]),
    Escape: onClose,
  };
  let lastGroup = '';
  return (
    <div data-spotlight className="anim-fade fixed inset-0 z-50 grid items-start justify-items-center bg-black/25 px-3 pt-[12vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.spotlight.title} data-lenis-prevent className="glass glass-dense anim-dialog w-full max-w-[640px] overflow-hidden rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <label className="flex items-center gap-3 border-b px-5 py-4">
          <Search size={24} className="text-muted-foreground" />
          <input
            autoFocus
            value={query}
            placeholder={t.spotlight.placeholder}
            aria-label={t.spotlight.title}
            aria-controls="spotlight-results"
            aria-activedescendant={hits[active] ? `spot-${hits[active].id}` : undefined}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              const act = keys[event.key];
              if (!act) return;
              event.preventDefault();
              act();
            }}
            className="min-w-0 flex-1 bg-transparent text-title-3 outline-none placeholder:text-faint-foreground"
          />
          <kbd className="rounded-md border bg-card px-2 py-0.5 text-caption font-semibold text-muted-foreground">esc</kbd>
        </label>
        <div id="spotlight-results" ref={list} role="listbox" aria-label={t.spotlight.title} className="max-h-[min(60vh,460px)] overflow-y-auto overscroll-contain p-2">
          {hits.length === 0 && <p className="px-3 py-8 text-center text-subhead text-muted-foreground">{t.spotlight.none}</p>}
          {hits.map((hit, index) => {
            const heading = hit.group !== lastGroup ? hit.group : null;
            lastGroup = hit.group;
            return (
              <div key={hit.id} role="presentation">
                {heading && <p aria-hidden className="px-3 pb-1 pt-3 text-footnote font-semibold text-muted-foreground">{heading}</p>}
                <HitRow hit={hit} index={index} active={index === active} onHover={() => setActive(index)} onChoose={() => choose(hit)} />
              </div>
            );
          })}
        </div>
        <p className="hidden gap-3 border-t px-5 py-2.5 text-caption text-muted-foreground sm:flex">
          <span>↑ ↓ {t.spotlight.move}</span>
          <span>↵ {t.spotlight.open}</span>
          <span>⌘K {t.spotlight.toggle}</span>
        </p>
      </div>
    </div>
  );
}
