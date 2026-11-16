// The admin's state: the token (session storage only), the catalogue snapshot (both languages), the media library, and what saving
// does (clear the public cache, toast, reload). Admin shapes that are not public DTOs stay here.
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/kit/toast';
import { ApiError, clearCache, send } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText, MediaItem, Verdict } from '@/lib/types';

export interface RawCondition { id: number; slug: string; name: LocalizedText; summary: LocalizedText; icon: string; color: string; media_id: number | null; active: boolean }
export interface RawFood { id: number; slug: string; category_id: number; name: LocalizedText }
export interface RawRule { id: number; condition_id: number; food_id: number; verdict: Verdict; reason: LocalizedText }
export interface Snapshot { conditions: RawCondition[]; foods: RawFood[]; rules: RawRule[]; categories: { id: number; slug: string; name: LocalizedText }[] }

const TOKEN_KEY = 'pathya.admin';

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** The words of an API refusal: its field messages, else its error. */
export const refusalText = (error: unknown): string => (error instanceof ApiError ? Object.values(error.fields).join(', ') || error.message : String(error));

export function useAdmin() {
  const { t } = useI18n();
  const [token, setToken] = useState(readToken);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(true);

  const loadMedia = useCallback((secret: string) => {
    void send<MediaItem[]>('/api/v1/admin/media', 'GET', undefined, secret).then(setMedia).catch(() => undefined);
  }, []);

  const load = useCallback(
    async (secret: string) => {
      setBusy(true);
      try {
        const data = await send<Snapshot>('/api/v1/admin/catalog', 'GET', undefined, secret);
        setSnapshot(data);
        setDenied(false);
        loadMedia(secret);
        if (secret) sessionStorage.setItem(TOKEN_KEY, secret);
        setToken(secret);
      } catch (error) {
        // an empty token is the silent staff-session try: no "denied" message for it
        setDenied(Boolean(secret) && error instanceof ApiError && error.status === 401);
        setSnapshot(null);
      } finally {
        setBusy(false);
      }
    },
    [loadMedia],
  );

  // a signed-in staff account needs no token: its session cookie opens the admin API
  useEffect(() => {
    void load(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = useCallback(() => {
    clearCache();
    toast(t.admin.saved);
    void load(token);
  }, [load, token, t]);

  const lock = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setSnapshot(null);
  };

  return { token, snapshot, media, denied, busy, load, loadMedia, saved, lock };
}

export type Admin = ReturnType<typeof useAdmin>;
