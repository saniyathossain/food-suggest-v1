// Long lists render in batches (24 at a time): the next batch loads before the reader reaches the end (an observer 900 px ahead),
// with a "Show more" button for keyboards and old browsers. A new filter starts again from the first batch. Cheap: only what is
// near the screen is in the page.
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@/components/icons';
import { useI18n } from '@/lib/i18n';

export function useReveal<Item>(items: Item[] | undefined, reset: unknown, step = 24) {
  const [count, setCount] = useState(step);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCount(step);
  }, [reset, step]);
  const total = items?.length ?? 0;
  const more = total > count;
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !more || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((now) => now + step);
    }, { rootMargin: '900px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [more, count, step]);
  return { visible: items?.slice(0, count), more, sentinel, showMore: () => setCount((now) => now + step), left: Math.max(0, total - count) };
}

export function RevealMore({ more, sentinel, showMore, left }: { more: boolean; sentinel: React.RefObject<HTMLDivElement | null>; showMore: () => void; left: number }) {
  const { t, num } = useI18n();
  if (!more) return null;
  return (
    <div ref={sentinel} className="mt-6 flex justify-center">
      <button type="button" onClick={showMore} className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border bg-card px-5 text-subhead font-semibold transition-colors hover:bg-muted">
        <Loader size={16} className="animate-spin" /> {t.common.more.replace('{n}', num(left))}
      </button>
    </div>
  );
}
