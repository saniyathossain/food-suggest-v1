// The outage screen's loop: ask /readyz, back off (2 s doubling to 60 s), reload the moment everything answers, and check again at
// once when the device comes back online.
import { useEffect, useRef, useState } from 'react';
import type { ReadyCheckDto } from '@/generated/ReadyCheckDto';
import { clearOutage, kindOf, readyz, type Outage } from '@/lib/outage';

const FIRST_MS = 2000;
const LONGEST_MS = 60000;

export function useOutageChecks(outage: Outage) {
  const [checks, setChecks] = useState<ReadyCheckDto[]>(outage.checks);
  const [kind, setKind] = useState(outage.kind);
  const [checking, setChecking] = useState(false);
  const [tries, setTries] = useState(0);
  const [wait, setWait] = useState({ until: Date.now() + FIRST_MS, total: FIRST_MS });
  const pause = useRef(FIRST_MS);
  const timer = useRef(0);

  const check = async () => {
    window.clearTimeout(timer.current);
    setChecking(true);
    const result = await readyz();
    setChecking(false);
    setChecks(result.checks);
    setKind(kindOf(result.checks));
    setTries((count) => count + 1);
    if (result.ok && navigator.onLine !== false) {
      clearOutage();
      location.reload();
      return;
    }
    pause.current = Math.min(pause.current * 2, LONGEST_MS);
    setWait({ until: Date.now() + pause.current, total: pause.current });
    timer.current = window.setTimeout(() => void check(), pause.current);
  };

  useEffect(() => {
    timer.current = window.setTimeout(() => void check(), FIRST_MS);
    const online = () => void check();
    window.addEventListener('online', online);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener('online', online);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- starts once per outage
  }, []);

  return { checks, kind, checking, tries, wait, check };
}
