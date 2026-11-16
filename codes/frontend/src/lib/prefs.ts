// Per-viewer preferences (language, theme, saved profile) in localStorage, shared via an external store.
import { useSyncExternalStore } from 'react';
import type { Lang, Profile, ThemeMode } from './types';

export interface Prefs { lang: Lang; theme: ThemeMode; profile: Profile | null; water: { day: string; glasses: number } }

const KEY = 'pathya.prefs';
const listeners = new Set<() => void>();

function load(): Prefs {
  const fallback: Prefs = { lang: 'en', theme: 'light', profile: null, water: { day: '', glasses: 0 } };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Prefs>) } : fallback;
  } catch {
    return fallback;
  }
}

let current = load();
apply(current);

function apply(prefs: Prefs): void {
  document.documentElement.dataset.theme = prefs.theme;
  document.documentElement.lang = prefs.lang;
}

export function setPrefs(patch: Partial<Prefs>): void {
  current = { ...current, ...patch };
  apply(current);
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // private mode: keep in memory only
  }
  listeners.forEach((listener) => listener());
}

/** The preferences now, outside React (the i18n adapter's `translate`). */
export function readPrefs(): Prefs {
  return current;
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
