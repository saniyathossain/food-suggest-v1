// 40-line history router: no dependency, works with the API's SPA fallback. It also tells the page transition (styles/glass.css)
// which way the reader is going: <html data-nav> is "deeper" (list → detail), "shallower" (detail → list, back) or "peer" (tab to tab).
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** How deep a path sits in the journey: Today 0, a section 1, one thing inside a section 2. */
export function depthOf(path: string): number {
  const clean = path.split('?')[0] ?? path;
  if (clean === '/' || clean === '') return 0;
  return /^\/(condition|food|recipe|read)\/[^/]+/.test(clean) || /^\/(welcome|reset)/.test(clean) ? 2 : 1;
}

let previous = location.pathname;
let inApp = false;
const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function direction(from: string, to: string): 'deeper' | 'shallower' | 'peer' {
  const a = depthOf(from);
  const b = depthOf(to);
  return b > a ? 'deeper' : b < a ? 'shallower' : 'peer';
}

/** Run a route change inside a view transition, tagged with its direction. */
function transition(to: string, change: () => void): void {
  document.documentElement.dataset.nav = direction(previous, to);
  previous = to.split(/[?#]/)[0] ?? to;
  if (doc.startViewTransition && !calm()) {
    doc.startViewTransition(change);
    return;
  }
  change();
}

// back and forward: the browser puts the scroll back where it was (history.scrollRestoration 'auto'); a new page starts at the top
window.addEventListener('popstate', () => transition(location.pathname, notify));

export function navigate(to: string): void {
  if (to === location.pathname + location.search) return;
  inApp = true;
  transition(to, () => {
    history.pushState(null, '', to);
    notify();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    window.dispatchEvent(new Event('pathya:navigate'));
  });
}

/** Back where the reader came from when that was inside the app; otherwise up to `parent` (a deep link has no history to go back to). */
export function goBack(parent: string): void {
  if (inApp && history.length > 1) history.back();
  else navigate(parent);
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
