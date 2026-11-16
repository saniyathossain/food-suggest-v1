// Time that is counted on screen: how long until the next check, how long something has been down (Shell Console's lib/countdown).
// The arithmetic is plain functions; `useNow` is the one clock a counter reads, a second at a time, and only while the tab is in front.
import { useSyncExternalStore } from 'react';
import { useVisible } from '@/lib/visible';

/** A counter on screen moves once a second. */
export const TICK_MS = 1000;

/** Whole seconds left until `until`: rounded up, never below 0. */
export const secondsLeft = (until: number, now: number): number => Math.max(0, Math.ceil((until - now) / TICK_MS));

/** Whole seconds since `since`, never below 0. */
export const secondsSince = (since: number, now: number): number => Math.max(0, Math.floor((now - since) / TICK_MS));

/** How much of `total` is left at `now`, from 0 to 1, for a ring that drains. */
export function shareLeft(until: number, total: number, now: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (until - now) / total));
}

/** Milliseconds from `at` to the next multiple of `period`, never 0. */
const untilNext = (period: number, at: number): number => period - (at % period);

/** A shared clock: one timer runs while anything watches, on the wall clock's own boundaries. */
function ticker(period: number) {
  let now = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watchers = new Set<() => void>();
  const arm = () => {
    timer = setTimeout(() => {
      now = Date.now();
      watchers.forEach((watcher) => watcher());
      arm();
    }, untilNext(period, Date.now()));
  };
  return {
    read: () => now,
    watch: (callback: () => void) => {
      watchers.add(callback);
      if (timer === undefined) {
        now = Date.now();
        arm();
      }
      return () => {
        watchers.delete(callback);
        if (watchers.size > 0) return;
        clearTimeout(timer);
        timer = undefined;
      };
    },
  };
}

const seconds = ticker(TICK_MS);
const minutes = ticker(30_000);
const still = () => () => undefined;

/** The time, again every second while `active` and the tab is in front. */
export function useNow(active = true): number {
  const visible = useVisible();
  return useSyncExternalStore(active && visible ? seconds.watch : still, seconds.read);
}

/** The time to the half minute: one shared timer for every clock on the page (the top bar's, the next meal's). */
export function useMinute(): number {
  const visible = useVisible();
  return useSyncExternalStore(visible ? minutes.watch : still, minutes.read);
}
