// Tiny fetch layer: in-memory cache + in-flight dedupe, abortable. No client library needed.
import { useEffect, useState } from 'react';
import { suspectOutage } from './outage';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: Record<string, string> = {},
    /** the API's error code, e.g. "upgrade_required" */
    public readonly code = '',
    /** for upgrade_required: the tier feature that is missing or used up */
    public readonly feature = '',
  ) {
    super(message);
  }
}

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

const OUTAGE_STATUS = new Set([502, 503, 504]);

async function request<Body>(url: string, init?: RequestInit): Promise<Body> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }).catch((error: unknown) => {
    suspectOutage();
    throw error;
  });
  if (OUTAGE_STATUS.has(response.status)) suspectOutage(response.headers.get('x-request-id') ?? '');
  if (response.status === 204) return undefined as Body;
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = payload as { error?: string; fields?: Record<string, string>; code?: string; feature?: string };
    throw new ApiError(response.status, body.error ?? response.statusText, body.fields ?? {}, body.code ?? '', body.feature ?? '');
  }
  return payload as Body;
}

export function getJson<Body>(url: string): Promise<Body> {
  if (cache.has(url)) return Promise.resolve(cache.get(url) as Body);
  const pending = inflight.get(url);
  if (pending) return pending as Promise<Body>;
  const next = request<Body>(url)
    .then((body) => {
      cache.set(url, body);
      return body;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, next);
  return next;
}

/** Warm the cache on hover/focus so navigation feels instant. */
export function prefetch(url: string): void {
  void getJson(url).catch(() => undefined);
}

export function send<Body>(url: string, method: string, body?: unknown, token?: string): Promise<Body> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  return request<Body>(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

export function clearCache(): void {
  cache.clear();
}

// what the mounted components are showing right now (url -> how many hooks read it), so a language switch can fetch the same
// things in the new language before it swaps the text
const watched = new Map<string, number>();

function watch(url: string): () => void {
  watched.set(url, (watched.get(url) ?? 0) + 1);
  return () => {
    const count = (watched.get(url) ?? 1) - 1;
    if (count > 0) watched.set(url, count);
    else watched.delete(url);
  };
}

/** Fetch everything on screen in language `to` (settles after `wait` ms at the latest), so the switch shows translated text
 *  at once instead of skeletons. Responses are keyed by their `lang=`, so the other language stays cached for switching back. */
export function prepareLanguage(from: string, to: string, wait = 1500): Promise<void> {
  const urls = [...watched.keys()].filter((url) => url.includes(`lang=${from}`)).map((url) => url.replace(`lang=${from}`, `lang=${to}`));
  const fetched = Promise.allSettled(urls.map((url) => getJson(url))).then(() => undefined);
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, wait));
  return Promise.race([fetched, timeout]);
}

export interface Resource<Body> { data: Body | undefined; error: ApiError | undefined; loading: boolean }

type Held<Body> = { url: string | null; data: Body | undefined; error: ApiError | undefined };

/**
 * The data for a URL. Data that belongs to another URL is never shown (a new language, a new search): while the new one loads the
 * caller gets `data: undefined, loading: true` and draws its skeleton, so old-language text never lingers. `previous` keeps the last
 * answer for callers that prefer to dim it (a list being filtered).
 */
export function useResource<Body>(url: string | null): Resource<Body> & { previous: Body | undefined } {
  const [held, setHeld] = useState<Held<Body>>(() => ({ url, data: url && cache.has(url) ? (cache.get(url) as Body) : undefined, error: undefined }));
  const [previous, setPrevious] = useState<Body | undefined>(undefined);
  useEffect(() => {
    if (url === null) return;
    const release = watch(url);
    if (cache.has(url)) {
      setHeld({ url, data: cache.get(url) as Body, error: undefined });
      return release;
    }
    let live = true;
    getJson<Body>(url)
      .then((data) => live && setHeld({ url, data, error: undefined }))
      .catch((error: unknown) => {
        const failure = error instanceof ApiError ? error : new ApiError(0, String(error));
        if (live) setHeld({ url, data: undefined, error: failure });
      });
    return () => {
      live = false;
      release();
    };
  }, [url]);
  useEffect(() => {
    if (held.data !== undefined) setPrevious(held.data);
  }, [held.data]);
  const current = held.url === url;
  const cached = url !== null && cache.has(url) ? (cache.get(url) as Body) : undefined;
  const data = current ? held.data : cached;
  return { data, error: current ? held.error : undefined, loading: url !== null && data === undefined && !(current && held.error), previous };
}

export const endpoints = {
  bootstrap: (lang: string) => `/api/v1/bootstrap?lang=${lang}`,
  condition: (slug: string, lang: string) => `/api/v1/conditions/${encodeURIComponent(slug)}?lang=${lang}`,
  foods: (lang: string, q: string, category: string, inSeason = false) =>
    `/api/v1/foods?lang=${lang}&q=${encodeURIComponent(q)}${category ? `&category=${encodeURIComponent(category)}` : ''}${inSeason ? '&season=now' : ''}`,
  plan: (lang: string) => `/api/v1/plan?lang=${lang}`,
  food: (slug: string, lang: string) => `/api/v1/foods/${encodeURIComponent(slug)}?lang=${lang}`,
  recipes: (lang: string) => `/api/v1/recipes?lang=${lang}`,
  searchIndex: (lang: string) => `/api/v1/search-index?lang=${lang}`,
  tiers: (lang: string) => `/api/v1/tiers?lang=${lang}`,
  gateways: (lang: string) => `/api/v1/billing/gateways?lang=${lang}`,
  recipe: (slug: string, lang: string) => `/api/v1/recipes/${encodeURIComponent(slug)}?lang=${lang}`,
  posts: (lang: string) => `/api/v1/posts?lang=${lang}`,
  post: (slug: string, lang: string) => `/api/v1/posts/${encodeURIComponent(slug)}?lang=${lang}`,
};
