// Blood sugar for a food (or the chosen way of cooking it): the glycemic index on a low / medium / high scale, the glycemic load
// of 100 g from the food's own carbohydrate, and a curve of blood sugar over two hours drawn from the GI next to pure glucose —
// labelled as an illustration, since the GI is an average, not this food's measured curve. The curve draws itself once.
import { CountUp } from '@/components/kit/countup';
import { ExternalLink } from '@/components/icons/page';
import { useI18n } from '@/lib/i18n';
import type { Glycemic, GlycemicBand } from '@/lib/types';
import { cn } from '@/lib/utils';

const BAND_TONE: Record<GlycemicBand, string> = { low: 'var(--leaf)', medium: 'var(--saffron)', high: 'var(--coral)' };
const SCALE_MAX = 110;

function BandChip({ band }: { band: GlycemicBand }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-caption font-semibold text-[color-mix(in_srgb,var(--tone)_62%,var(--foreground))] [background:color-mix(in_srgb,var(--tone)_16%,transparent)]" style={{ '--tone': BAND_TONE[band] } as React.CSSProperties}>
      {t.glycemic.band[band]}
    </span>
  );
}

/** 0-110 scale with the three bands; a marker at this food's GI. */
function Scale({ gi }: { gi: number }) {
  const at = (value: number) => `${(Math.min(value, SCALE_MAX) / SCALE_MAX) * 100}%`;
  return (
    <div className="relative mt-3 h-2.5 rounded-full" aria-hidden>
      <div className="absolute inset-y-0 left-0 rounded-l-full bg-leaf/70" style={{ width: at(55) }} />
      <div className="absolute inset-y-0 bg-saffron/70" style={{ left: at(55), width: `calc(${at(70)} - ${at(55)})` }} />
      <div className="absolute inset-y-0 right-0 rounded-r-full bg-coral/70" style={{ left: at(70) }} />
      <span className="scale-marker absolute -top-1.5 size-5 -translate-x-1/2 rounded-full border-[3px] border-card bg-foreground shadow-md" style={{ left: at(gi) }} />
    </div>
  );
}

const MINUTES = 120;
const PEAK = 35;
/** Blood-sugar rise over time for pure glucose (peak 1 at 35 min); a food is the same shape scaled by GI / 100. */
const rise = (minute: number) => (minute / PEAK) * Math.exp(1 - minute / PEAK);

function path(scale: number, width: number, height: number, close: boolean) {
  const points: string[] = [];
  for (let minute = 0; minute <= MINUTES; minute += 4) {
    const x = (minute / MINUTES) * width;
    const y = height - rise(minute) * scale * (height - 8);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const line = `M${points.join(' L')}`;
  return close ? `${line} L${width},${height} L0,${height} Z` : line;
}

function Curve({ gi, band }: { gi: number; band: GlycemicBand }) {
  const { t, num } = useI18n();
  const width = 320;
  const height = 140;
  const scale = Math.min(gi, SCALE_MAX) / 100;
  return (
    <figure className="m-0 grid gap-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-subhead font-semibold">
        {t.glycemic.curve}
        <span className="flex items-center gap-3 text-caption font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 border-t-2 border-dashed border-muted-foreground" />{t.glycemic.glucose}</span>
          <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full" style={{ background: BAND_TONE[band] }} />{t.glycemic.thisFood}</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full overflow-visible" role="img" aria-label={`${t.glycemic.curve}: ${t.glycemic.gi} ${num(gi)}`}>
        <defs>
          <linearGradient id="glucose-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={BAND_TONE[band]} stopOpacity="0.38" />
            <stop offset="100%" stopColor={BAND_TONE[band]} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((line) => (
          <line key={line} x1="0" x2={width} y1={height * line} y2={height * line} stroke="var(--border)" strokeWidth="1" />
        ))}
        <path d={path(1, width, height, false)} fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.7" />
        <path d={path(scale, width, height, true)} fill="url(#glucose-fill)" className="curve-fill" />
        <path d={path(scale, width, height, false)} fill="none" stroke={BAND_TONE[band]} strokeWidth="3" strokeLinecap="round" pathLength={1} className="curve-draw" />
        {[0, 30, 60, 90, 120].map((minute) => (
          <text key={minute} x={(minute / MINUTES) * width} y={height + 15} textAnchor={minute === 0 ? 'start' : minute === MINUTES ? 'end' : 'middle'} className="fill-muted-foreground text-[8px]">
            {num(minute)} {minute === MINUTES ? t.glycemic.minutes : ''}
          </text>
        ))}
      </svg>
      <p className="text-footnote text-muted-foreground">{t.glycemic.curveNote}</p>
    </figure>
  );
}

export function GlycemicPanel({ glycemic, className }: { glycemic: Glycemic; className?: string | undefined }) {
  const { t } = useI18n();
  return (
    <section aria-label={t.glycemic.title} className={cn('grid gap-6 rounded-2xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10', className)}>
      <div className="grid content-start gap-6">
        <div>
          <h3 className="text-headline">{t.glycemic.title}</h3>
          <p className="mt-1 text-subhead text-muted-foreground">{t.glycemic.lead}</p>
        </div>
        <div>
          <p className="flex flex-wrap items-baseline gap-2">
            <CountUp value={glycemic.gi} className="numeral text-[44px] leading-none" />
            <span className="text-subhead text-muted-foreground">
              {t.glycemic.gi} · {t.glycemic.giOf}
            </span>
            <BandChip band={glycemic.band} />
          </p>
          <Scale gi={glycemic.gi} />
        </div>
        {glycemic.load_per_100g !== null && glycemic.load_band && (
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-3.5">
              <dt className="text-footnote text-muted-foreground">
                {t.glycemic.load} · {t.glycemic.per100}
              </dt>
              <dd className="mt-1 flex items-baseline gap-2">
                <CountUp value={glycemic.load_per_100g} digits={1} className="numeral text-title-2" />
                <BandChip band={glycemic.load_band} />
              </dd>
            </div>
            {glycemic.available_carb_g !== null && (
              <div className="rounded-xl bg-muted p-3.5">
                <dt className="text-footnote text-muted-foreground">{t.glycemic.available}</dt>
                <dd className="mt-1 flex items-baseline gap-1">
                  <CountUp value={glycemic.available_carb_g} digits={1} className="numeral text-title-2" />
                  <span className="text-footnote text-muted-foreground">g</span>
                </dd>
              </div>
            )}
          </dl>
        )}
        {glycemic.source && (
          <p className="text-footnote text-muted-foreground">
            {glycemic.source.url ? (
              <a href={glycemic.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                {glycemic.source.publisher} <ExternalLink size={12} />
              </a>
            ) : (
              glycemic.source.publisher
            )}
          </p>
        )}
      </div>
      <Curve key={glycemic.gi} gi={glycemic.gi} band={glycemic.band} />
    </section>
  );
}
