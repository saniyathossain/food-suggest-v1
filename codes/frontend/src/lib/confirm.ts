// The app's own confirm and notice dialogs. `confirm({...})` resolves true when the person agrees and false when they cancel or press Esc,
// so a destructive action reads `if (!(await confirmDialog({ title, tone: 'danger' }))) return;`. The browser's window.confirm / alert / prompt
// are not used anywhere (main.tsx turns them off, and the build refuses a source file that calls them).
import { useSyncExternalStore } from 'react';

export type Ask = {
  title: string;
  body?: string | undefined;
  /** the agree button's words; defaults to "Delete" for danger and "Yes" otherwise */
  action?: string | undefined;
  tone?: 'danger' | 'normal' | undefined;
  /** true for a notice: one button, nothing to decide */
  notice?: boolean | undefined;
};
type Open = Ask & { done: (agreed: boolean) => void };

let current: Open | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function ask(options: Ask): Promise<boolean> {
  return new Promise((resolve) => {
    // one at a time: a second ask while one is open counts as a cancel of the first
    current?.done(false);
    current = { ...options, done: resolve };
    notify();
  });
}

export const confirmDialog = (options: Ask): Promise<boolean> => ask(options);
export const notice = (options: Omit<Ask, 'notice'>): Promise<boolean> => ask({ ...options, notice: true });

export function answer(agreed: boolean): void {
  const open = current;
  current = null;
  notify();
  open?.done(agreed);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useAsk = (): Open | null => useSyncExternalStore(subscribe, () => current, () => null);
