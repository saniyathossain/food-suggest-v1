// Toasts for actions ("Saved", "Copied", "Water logged"): one small store, one layer near the top of the screen, each toast leaves on
// its own after a few seconds. role="status" so screen readers hear it without moving focus. CSS only (first-paint safe).
import { useSyncExternalStore } from 'react';
import { Check, CircleAlert } from '@/components/icons/page';
import { cn } from '@/lib/utils';

type Toast = { id: number; text: string; tone: 'ok' | 'bad' };

let toasts: Toast[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function toast(text: string, tone: Toast['tone'] = 'ok'): void {
  counter += 1;
  const id = counter;
  toasts = [...toasts.slice(-2), { id, text, tone }];
  notify();
  window.setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id);
    notify();
  }, 2600);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function ToastLayer() {
  const list = useSyncExternalStore(subscribe, () => toasts);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(84px+env(safe-area-inset-top))] z-[60] grid justify-items-center gap-2 px-4">
      {list.map((item) => (
        <p key={item.id} className="glass glass-dense enter-pop flex items-center gap-2.5 rounded-full py-2.5 pl-3 pr-5 text-subhead font-semibold">
          <span className={cn('grid size-6 place-items-center rounded-full text-white', item.tone === 'ok' ? 'bg-recommended' : 'bg-avoid')}>
            {item.tone === 'ok' ? <Check size={14} strokeWidth={2.4} /> : <CircleAlert size={14} />}
          </span>
          {item.text}
        </p>
      ))}
    </div>
  );
}
