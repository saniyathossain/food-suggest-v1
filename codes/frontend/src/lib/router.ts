// 40-line history router: no dependency, works with the API's SPA fallback.
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
// back and forward: the browser puts the scroll back where it was (history.scrollRestoration 'auto'); a new page starts at the top
window.addEventListener('popstate', notify);

export function navigate(to: string): void {
  if (to === location.pathname + location.search) return;
  const go = () => {
    history.pushState(null, '', to);
    notify();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    window.dispatchEvent(new Event('pathya:navigate'));
  };
  const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(go);
    return;
  }
  go();
}

export function usePath(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => location.pathname,
  );
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const names: string[] = [];
  const source = pattern.replace(/:([a-z]+)/g, (_, name: string) => {
    names.push(name);
    return '([^/]+)';
  });
  const found = new RegExp(`^${source}/?$`).exec(path);
  if (!found) return null;
  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(found[index + 1] ?? '')]));
}

/** Anchor that routes client-side (keeps cmd-click / middle-click working). */
export function onLink(event: React.MouseEvent<HTMLAnchorElement>): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  navigate(event.currentTarget.getAttribute('href') ?? '/');
}
