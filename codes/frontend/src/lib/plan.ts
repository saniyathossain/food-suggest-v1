// The day plan for a profile: POST /plan, cached per language and profile for the session (Plan page, Today's tip).
import { useEffect, useState } from 'react';
import { ApiError, endpoints, send } from '@/lib/api';
import type { Plan, Profile } from '@/lib/types';

const planCache = new Map<string, Plan>();

export function usePlan(profile: Profile | null, lang: string): { data?: Plan | undefined; error?: ApiError | undefined } {
  const key = profile ? `${lang}:${JSON.stringify(profile)}` : '';
  const [state, setState] = useState<{ key: string; data?: Plan | undefined; error?: ApiError | undefined }>(() => ({ key, data: planCache.get(key) }));
  useEffect(() => {
    if (!profile) return;
    const cached = planCache.get(key);
    if (cached) {
      setState({ key, data: cached });
      return;
    }
    let live = true;
    send<Plan>(endpoints.plan(lang), 'POST', profile)
      .then((data) => {
        planCache.set(key, data);
        if (live) setState({ key, data });
      })
      .catch((error: unknown) => live && setState({ key, error: error instanceof ApiError ? error : new ApiError(0, String(error)) }));
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (state.key !== key) return { data: planCache.get(key) };
  return state;
}

/** Today as a whole number of days (Dhaka's date), for picks that change once a day and are the same for everyone. */
export function dayNumber(): number {
  const dhaka = new Date(Date.now() + 6 * 3_600_000);
  return Math.floor(dhaka.getTime() / 86_400_000);
}

/** The item for today from a list (deterministic by date). */
export function pickForToday<Item>(items: Item[], salt = 0): Item | undefined {
  if (items.length === 0) return undefined;
  return items[(dayNumber() + salt) % items.length];
}
