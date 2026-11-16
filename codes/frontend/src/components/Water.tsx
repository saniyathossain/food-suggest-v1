// Today's water: eight glasses that fill on a spring when tapped (a toast counts them), kept on this device only.
import { GlassWater } from '@/components/icons/page';
import { toast } from '@/components/kit/toast';
import { useI18n } from '@/lib/i18n';
import { setPrefs, usePrefs } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const GOAL = 8;

export function WaterWidget({ className }: { className?: string | undefined }) {
  const { t, num } = useI18n();
  const { water } = usePrefs();
  const today = new Date().toDateString();
  const count = water.day === today ? water.glasses : 0;
  const log = (index: number) => {
    const glasses = index + 1 === count ? index : index + 1;
    setPrefs({ water: { day: today, glasses } });
    if (glasses > count) toast(`${num(glasses)} / ${num(GOAL)} ${t.widget.glasses}`);
  };
  return (
    <section aria-labelledby="water-title" className={cn('pastel relative isolate overflow-hidden rounded-[28px] p-5 [--tile:var(--tint-sky)] [--tone:var(--ok)] sm:p-6', className)}>
      {/* FlavorFit's water tile: the tile fills with a slow wave as glasses are logged */}
      <span aria-hidden className="water-fill absolute inset-x-0 bottom-0 -z-10" style={{ height: `${Math.round((count / GOAL) * 100)}%` }}>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="water-wave absolute -top-[14px] left-0 h-4 w-[200%]">
          <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 T 350 10 T 400 10 V 20 H 0 Z" fill="currentColor" />
        </svg>
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="water-title" className="flex items-center gap-2 text-headline font-semibold">
          <GlassWater size={20} className="text-[var(--tone-sky)]" /> {t.widget.water}
        </h2>
        <strong className="text-title-3 tabular-nums">
          {num(count)}
          <span className="text-subhead font-medium text-muted-foreground"> / {num(GOAL)} {t.widget.glasses}</span>
        </strong>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-1.5 sm:gap-2.5">
        {Array.from({ length: GOAL }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`${num(index + 1)} ${t.widget.glasses}`}
            aria-pressed={index < count}
            onClick={() => log(index)}
            className="press group relative h-14 cursor-pointer overflow-hidden rounded-b-xl rounded-t-md border-2 border-[color-mix(in_srgb,var(--tone-sky)_35%,transparent)] bg-card hover:border-[var(--tone-sky)]"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 origin-bottom bg-[linear-gradient(180deg,color-mix(in_srgb,var(--tone-sky)_45%,white),var(--tone-sky))] transition-[scale] duration-500 ease-[var(--ease-bounce)]"
              style={{ height: '100%', scale: `1 ${index < count ? 1 : 0}` }}
            />
          </button>
        ))}
      </div>
      <p className="mt-3 text-footnote text-muted-foreground">{t.widget.tapToAdd}</p>
    </section>
  );
}
