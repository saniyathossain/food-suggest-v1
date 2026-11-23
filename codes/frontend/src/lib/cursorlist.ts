// A list the API pages with a cursor (a page, then `next_cursor` for the next one): the first page loads when the filters change, the rest on
// demand (the page asks `loadMore` as the reader nears the end). The first page's other fields (facets, the total) stay available, so a filter
// bar can show live counts. A new `reset` key (the filters as text) starts over; an answer for an older key is dropped.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, send } from '@/lib/api';

export interface CursorPage<Item> {
  items: Item[];
  next_cursor: string | null;
  total: number;
}

export function useCursorList<Item, Page extends CursorPage<Item>>(urlFor: (cursor: string | null) => string, reset: string) {
  const [first, setFirst] = useState<Page | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(reset);
  const build = useRef(urlFor);
  build.current = urlFor;
  useEffect(() => {
    key.current = reset;
    setBusy(true);
    setError(null);
    void send<Page>(build.current(null), 'GET')
      .then((page) => {
        if (key.current !== reset) return;
        setFirst(page);
        setItems(page.items);
        setCursor(page.next_cursor);
      })
      .catch((failure: unknown) => {
        if (key.current === reset) setError(failure instanceof ApiError ? failure : new ApiError(0, String(failure)));
      })
      .finally(() => {
        if (key.current === reset) setBusy(false);
      });
  }, [reset]);
  const loadMore = useCallback(() => {
    if (cursor === null || busy) return;
    const asked = key.current;
    setBusy(true);
    void send<Page>(build.current(cursor), 'GET')
      .then((page) => {
        if (key.current !== asked) return;
        setItems((now) => [...now, ...page.items]);
        setCursor(page.next_cursor);
      })
      .catch((failure: unknown) => setError(failure instanceof ApiError ? failure : new ApiError(0, String(failure))))
      .finally(() => setBusy(false));
  }, [cursor, busy]);
  return { first, items, more: cursor !== null, busy, error, loadMore };
}
