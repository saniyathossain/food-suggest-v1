// The day as a track (FlavorFit's schedule strip): 5 am to midnight, a dot at each meal's time and the gaps between them as thin
// segments, now as a hairline. One series, so no legend; the first and last meal are labelled, every dot names itself on hover.
import { clock, useI18n } from '@/lib/i18n';
import { useMinute } from '@/lib/countdown';

const START = 5 * 60;
const END = 24 * 60;

export function minutesOf(time: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const place = (minute: number) => `${(((Math.min(END, Math.max(START, minute)) - START) / (END - START)) * 100).toFixed(2)}%`;

export function DayTrack({ meals, label }: { meals: { name: string; time: string }[]; label: string }) {
  const { lang } = useI18n();
  const now = new Date(useMinute());
  const minute = now.getHours() * 60 + now.getMinutes();
  const points = meals.map((meal) => ({ ...meal, at: minutesOf(meal.time) })).filter((meal): meal is { name: string; time: string; at: number } => meal.at !== null);
  if (points.length === 0) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return (
    <figure className="m-0 grid gap-1.5" aria-label={label}>
      <div className="relative h-6">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--tint-ink)_12%,transparent)]" />
        <span aria-hidden className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--tint-ink)]/35" style={{ left: place(first.at), width: `calc(${place(last.at)} - ${place(first.at)})` }} />
        {minute >= START && <span aria-hidden className="absolute top-0 h-6 w-px bg-[var(--tint-ink)]" style={{ left: place(minute) }} />}
        <ul className="contents">
          {points.map((meal) => (
            <li key={meal.name} title={`${meal.name} · ${clock(meal.time, lang)}`} className="absolute top-1/2 grid size-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--tint-ink)] ring-[3px] ring-[var(--tile,var(--card))]" style={{ left: place(meal.at) }}>
              <span className="sr-only">{`${meal.name} ${clock(meal.time, lang)}`}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption aria-hidden className="flex justify-between text-caption font-semibold opacity-70">
        <span>{clock(first.time, lang)}</span>
        <span>{clock(last.time, lang)}</span>
      </figcaption>
    </figure>
  );
}
