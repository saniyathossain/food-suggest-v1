// The app's own dependencies being down is not a page error: it is told once, over everything, by components/Outage.
// A failed call only SUSPECTS an outage (one slow 502 is not one); /readyz decides (Shell Console's pattern).
import { useSyncExternalStore } from 'react';
import type { ReadinessDto } from '../generated/ReadinessDto';
import type { ReadyCheckDto } from '../generated/ReadyCheckDto';

export type OutageKind = 'offline' | 'server' | 'database';

export interface Outage {
  since: number;
  kind: OutageKind;
  checks: ReadyCheckDto[];
  requestId: string;
}

let state: Outage | null = null;
let probing = false;
const listeners = new Set<() => void>();

function set(next: Outage | null): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Ask the server what is up. A refused or timed-out request means the server itself is not answering. */
export async function readyz(): Promise<{ ok: boolean; checks: ReadyCheckDto[]; requestId: string }> {
  try {
    const response = await fetch('/readyz', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const body = (await response.json().catch(() => null)) as ReadinessDto | null;
    if (!body) return { ok: false, checks: [], requestId: '' };
    return { ok: body.ok, checks: body.checks, requestId: response.headers.get('x-request-id') ?? '' };
  } catch {
    return { ok: false, checks: [], requestId: '' };
  }
}

export function kindOf(checks: ReadyCheckDto[]): OutageKind {
  if (navigator.onLine === false) return 'offline';
  if (checks.some((check) => check.kind === 'database' && !check.up)) return 'database';
  return 'server';
}

/** A call failed the way an outage fails: confirm with /readyz before taking over the screen. */
export function suspectOutage(requestId = ''): void {
  if (state || probing) return;
  probing = true;
  void readyz()
    .then((result) => {
      if (result.ok && navigator.onLine !== false) return;
      set({ since: Date.now(), kind: kindOf(result.checks), checks: result.checks, requestId: requestId || result.requestId });
    })
    .finally(() => {
      probing = false;
    });
}

export function clearOutage(): void {
  if (state) set(null);
}

export function useOutage(): Outage | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

window.addEventListener('offline', () => suspectOutage());
