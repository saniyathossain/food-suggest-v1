// The next meal, live: a ring filling toward it, its name and time, and how long until (Today's hero).
import { Utensils } from '@/components/icons';
import { useMinute } from '@/lib/countdown';
import { clock, digits, useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import type { Bootstrap } from '@/lib/types';

const minutesOf = (time: string) => {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
};

/** Bangladesh's meal slots, and the next one from now (wrapping to tomorrow's first). */
export function useNextSlot(boot: Bootstrap) {
  const now = new Date(useMinute());
  const slots = boot.meal_slots.filter((slot) => slot.country === 'BD');
  const current = now.getHours() * 60 + now.getMinutes();
  const next = slots.find((slot) => minutesOf(slot.time) >= current) ?? slots[0];
  return { slots, next, current };
}

/** The next meal as a pill on the hero photo: a ring filling toward it, its name and time, and how long until. */
export function NextMeal({ boot }: { boot: Bootstrap }) {
  const { t, lang } = useI18n();
  const { profile } = usePrefs();
  const { slots, next, current } = useNextSlot(boot);
  // everyday clock meals only: a fasting mode (Ramadan, 16:8) has its own times, shown on the plan
  if (!next || (profile?.mode && profile.mode !== 'everyday')) return null;
  const previous = slots[slots.indexOf(next) - 1];
  const target = minutesOf(next.time) + (minutesOf(next.time) < current ? 1440 : 0);
  const start = previous ? minutesOf(previous.time) : target - 180;
  const left = target - current;
  const share = Math.max(4, Math.min(100, ((current - start) / Math.max(1, target - start)) * 100));
  const eta = left <= 5 ? t.widget.now : left >= 60 ? `${Math.floor(left / 60)}${t.common.h} ${left % 60}${t.common.min}` : `${left} ${t.common.min}`;
  return (
    <div role="status" className="flex items-center gap-3 rounded-full border border-border bg-card py-2 pl-2 pr-5 text-foreground shadow-md">
      <span className="relative grid size-11 place-items-center rounded-full" style={{ background: `conic-gradient(#16a34a ${share}%, color-mix(in srgb, var(--foreground) 10%, transparent) 0)` }}>
        <span className="grid size-8 place-items-center rounded-full bg-card">
          <Utensils size={17} />
        </span>
      </span>
      <span className="grid leading-tight">
        <small className="text-footnote text-muted-foreground">
          {t.widget.nextMeal} · {clock(next.time, lang)}
        </small>
        <strong className="text-callout">{next.name}</strong>
      </span>
      <span className="ml-1 text-subhead font-bold tabular-nums text-foreground">{digits(eta, lang)}</span>
    </div>
  );
}
