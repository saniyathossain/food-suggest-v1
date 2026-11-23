// The add / edit form's state for an external sync source: the draft, how it is made from a saved source or a platform preset,
// and how it becomes the API's input.
import type { SyncKind, SyncMethod, SyncMode, SyncPlatform, SyncSource, SyncSourceInput } from '@/lib/types';

export const KINDS: SyncKind[] = ['medicines', 'foods', 'conditions', 'allergies', 'custom'];
export const METHODS: SyncMethod[] = ['get', 'post', 'put', 'patch', 'delete'];
export const MODES: SyncMode[] = ['update', 'append'];
/** PUT, PATCH and DELETE change something on the other side (the server holds the same rule). */
export const isWrite = (method: SyncMethod): boolean => method === 'put' || method === 'patch' || method === 'delete';

export type Header = { name: string; value: string; secret: boolean };
export type Draft = {
  slug: string; name: string; kind: SyncKind; base_url: string; method: SyncMethod; query_template: string; body: string; mode: SyncMode; platform: string;
  headers: Header[]; timeout_ms: string; max_retries: string; backoff_base_ms: string; backoff_factor: string; backoff_max_ms: string; jitter: boolean; every: boolean; hours: string; active: boolean;
};

export const blank = (): Draft => ({ slug: '', name: '', kind: 'medicines', base_url: '', method: 'get', query_template: '', body: '', mode: 'update', platform: '', headers: [], timeout_ms: '', max_retries: '', backoff_base_ms: '', backoff_factor: '', backoff_max_ms: '', jitter: true, every: false, hours: '', active: false });

/** A saved source's own numbers are shown as values; a new source leaves them empty so the placeholders show the defaults. */
export const fromSource = (source: SyncSource): Draft => ({
  ...blank(), slug: source.slug, name: source.name, kind: source.kind, base_url: source.base_url, method: source.method, query_template: source.query_template, body: source.body, mode: source.mode, platform: source.platform ?? '',
  headers: source.headers.map(({ name, value, secret }) => ({ name, value, secret })), timeout_ms: String(source.timeout_ms), max_retries: String(source.max_retries), backoff_base_ms: String(source.backoff_base_ms),
  backoff_factor: String(source.backoff_factor), backoff_max_ms: String(source.backoff_max_ms), jitter: source.jitter, every: source.schedule_hours !== null, hours: String(source.schedule_hours ?? ''), active: source.active,
});

/** A platform preset over the draft: address, method, headers (secrets empty), query, body, kind and mode; the name and slug only when empty. */
export const withPlatform = (draft: Draft, preset: SyncPlatform, fresh: boolean): Draft => ({
  ...draft, platform: preset.slug, kind: preset.kind, base_url: preset.base_url, method: preset.method, query_template: preset.query_template, body: preset.body, mode: preset.mode,
  headers: preset.headers.map(({ name, value, secret }) => ({ name, value, secret })), name: draft.name.trim() || preset.name, slug: fresh && !draft.slug.trim() ? preset.slug : draft.slug,
});

const number = (text: string, fallback: number): number => (text.trim() === '' ? fallback : Number(text));

export const toInput = (draft: Draft, fresh: boolean): SyncSourceInput => ({
  ...(fresh ? { slug: draft.slug.trim() } : {}),
  name: draft.name.trim(), kind: draft.kind, base_url: draft.base_url.trim(), method: draft.method, query_template: draft.query_template, body: draft.body, mode: draft.mode, platform: draft.platform || null,
  headers: draft.headers.filter((header) => header.name.trim()).map((header) => ({ ...header, name: header.name.trim() })),
  timeout_ms: number(draft.timeout_ms, 15000), max_retries: number(draft.max_retries, 3), backoff_base_ms: number(draft.backoff_base_ms, 500), backoff_factor: number(draft.backoff_factor, 2), backoff_max_ms: number(draft.backoff_max_ms, 30000),
  jitter: draft.jitter, schedule_hours: draft.every ? number(draft.hours, 24) : null, active: draft.active,
});
