// Whether the tab is in front: a clock or a counter can ask without polling (Shell Console's lib/visible).
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
document.addEventListener('visibilitychange', () => listeners.forEach((listener) => listener()));

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The tab is in front (re-renders when it changes). */
export function useVisible(): boolean {
  return useSyncExternalStore(subscribe, () => !document.hidden);
}
