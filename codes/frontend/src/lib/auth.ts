// Who is signed in: one shared store (useSyncExternalStore) filled from /auth/me. The session lives in an HttpOnly cookie
// the page cannot read; this only mirrors who it belongs to. Signing in or out clears every cached response, so one
// person's data never shows for another.
import { useSyncExternalStore } from 'react';
import { ApiError, clearCache, send } from '@/lib/api';
import type { Me } from '@/lib/types';

type AuthState = { status: 'loading' | 'in' | 'out'; me: Me | null };

let state: AuthState = { status: 'loading', me: null };
const listeners = new Set<() => void>();
const HINT = 'pathya.signed';
const set = (next: AuthState) => {
  state = next;
  // remember on this device whether someone was signed in, so the next visit can draw the right page before /auth/me answers
  if (next.status !== 'loading') {
    try {
      localStorage.setItem(HINT, next.status === 'in' ? '1' : '0');
    } catch {
      // storage blocked: the page simply waits for /auth/me
    }
  }
  listeners.forEach((listener) => listener());
};

/** Whether this device had someone signed in last time (a hint only; the server decides). */
export function wasSignedIn(): boolean {
  try {
    return localStorage.getItem(HINT) === '1';
  } catch {
    return false;
  }
}

export async function refreshMe(): Promise<Me | null> {
  try {
    // null when nobody is signed in (200, so no error shows in the console)
    const me = await send<Me | null>('/api/v1/auth/me', 'GET');
    set(me ? { status: 'in', me } : { status: 'out', me: null });
    return me;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) set({ status: 'out', me: null });
    else set({ status: state.me ? 'in' : 'out', me: state.me });
    return null;
  }
}

let started = false;
export function useAuth(): AuthState {
  if (!started) {
    started = true;
    void refreshMe();
  }
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export async function signIn(email: string, password: string): Promise<Me> {
  const me = await send<Me>('/api/v1/auth/login', 'POST', { email, password });
  clearCache();
  set({ status: 'in', me });
  return me;
}

export async function signUp(name: string, email: string, password: string, locale: string): Promise<Me> {
  const me = await send<Me>('/api/v1/auth/register', 'POST', { name, email, password, locale });
  clearCache();
  set({ status: 'in', me });
  return me;
}

export async function signOut(): Promise<void> {
  await send('/api/v1/auth/logout', 'POST').catch(() => undefined);
  clearCache();
  set({ status: 'out', me: null });
}

/** A tier feature's value for the signed-in account: a count (-1 unlimited) or 1 / 0. */
export function feature(me: Me | null, key: Me['tier']['features'][number]['feature']): number {
  return me?.tier.features.find((item) => item.feature === key)?.value ?? 0;
}

/** Where to go after signing in: the page that sent you here, if it is one of ours. */
export function nextPath(fallback = '/plan'): string {
  const next = new URLSearchParams(location.search).get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
