// Small helpers for the admin operations screens: load a JSON endpoint with the admin token, and download a file from one.
import { useCallback, useEffect, useState } from 'react';
import { send } from '@/lib/api';
import { refusalText } from '@/components/admin/useAdmin';

/** Load `path` now and whenever `token` or `path` changes; `reload` loads it again (after a save). */
export function useGet<Body>(path: string, token: string) {
  const [data, setData] = useState<Body | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    setError('');
    void send<Body>(path, 'GET', undefined, token).then(setData).catch((failure) => setError(refusalText(failure)));
  }, [path, token]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, reload };
}

/** Fetch a file with the admin token and hand it to the browser as a download. */
export async function download(path: string, token: string, filename: string): Promise<void> {
  const response = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(String(response.status));
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
