// A habit check-in kept on this device: which days a habit was done (the last 90), shared through an external store like lib/prefs.
// A streak is the run of days ending today (or yesterday: a habit not yet ticked today still holds its streak until the day ends).
// Nothing leaves the phone; a signed-in sync can replace the storage later without touching the screens.
import { useSyncExternalStore } from 'react';

const KEY = 'pathya.habits';
const KEEP_DAYS = 90;
const WEEK = 7;
const listeners = new Set<() => void>();

type Log = Readonly<Record<string, readonly string[]>>;

function load(): Log {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Log) : {};
  } catch {
    return {};
  }
}

let current = load();

/** A local calendar day as YYYY-MM-DD (the person's own day, not UTC's). */
export function dayKey(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const back = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dayKey(date);
};

/** One habit's identity: its condition (or general), its icon and its place in that list. */
export const habitKey = (condition: string | undefined, icon: string, index: number): string => `${condition ?? 'general'}|${icon}|${index}`;

export function toggleHabit(key: string): void {
  const today = dayKey();
  const days = current[key] ?? [];
  const next = days.includes(today) ? days.filter((day) => day !== today) : [...days, today].sort().slice(-KEEP_DAYS);
  current = { ...current, [key]: next };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // private mode: kept in memory for this visit
  }
  listeners.forEach((listener) => listener());
}

export function useHabitLog(): Log {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

export const doneToday = (log: Log, key: string): boolean => (log[key] ?? []).includes(dayKey());

export function streakOf(log: Log, key: string): number {
  const days = new Set(log[key] ?? []);
  let offset = days.has(back(0)) ? 0 : 1;
  let run = 0;
  while (days.has(back(offset))) {
    run += 1;
    offset += 1;
  }
  return run;
}

/** The last seven days, oldest first: done or not. */
export const weekOf = (log: Log, key: string): boolean[] => {
  const days = new Set(log[key] ?? []);
  return Array.from({ length: WEEK }, (_, index) => days.has(back(WEEK - 1 - index)));
};
