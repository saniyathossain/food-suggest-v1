// useState that remembers its value on this device (localStorage): a list page's filters come back as the reader left them.
import { useEffect, useState } from 'react';

export function usePersisted<Value>(key: string, initial: Value): [Value, (next: Value) => void] {
  const [value, setValue] = useState<Value>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as Value);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // private mode: kept for this visit only
    }
  }, [key, value]);
  return [value, setValue];
}
