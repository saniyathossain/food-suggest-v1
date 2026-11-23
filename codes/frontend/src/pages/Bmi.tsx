// BMI calculator. Asian cut-offs are primary because South Asians carry higher risk at a lower BMI; the WHO international band is
// shown for reference. Calculated in the browser; nothing stored or sent. Not for children, pregnancy or very muscular people.
import { useState } from 'react';
import { BmiGauge } from '@/components/BmiGauge';
import { Scale, Sparkles, type AppIcon } from '@/components/icons';
import { Info, Ruler } from '@/components/icons/page';
import { Rolling } from '@/components/kit/rolling';
import { Sources } from '@/components/Sources';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { BANDS, bandOf, bmiOf, round1, worldBand } from '@/lib/bmi';
import { digits, useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import { tone } from '@/lib/utils';

type Unit = 'metric' | 'imperial';

function Slider({ label, icon: Glyph, value, min, max, step, unit, onChange }: { label: string; icon: AppIcon; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const { num } = useI18n();
  return (
    <label className="grid gap-3">
      <span className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-subhead font-semibold text-muted-foreground">
          <Glyph size={18} /> {label}
        </span>
        <span className="numeral text-title-2 font-bold">
          {num(value)} <small className="text-subhead font-medium text-muted-foreground">{unit}</small>
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="lens-range h-7 w-full accent-[var(--primary)]" />
    </label>
  );
}

function Inputs({ heightCm, weightKg, setHeightCm, setWeightKg }: { heightCm: number; weightKg: number; setHeightCm: (value: number) => void; setWeightKg: (value: number) => void }) {
  const { t, lang } = useI18n();
  const [unit, setUnit] = useState<Unit>('metric');
  const metric = unit === 'metric';
  const feet = Math.floor(heightCm / 30.48);
  const inches = Math.round((heightCm / 2.54) % 12);
  const fromFeet = (value: number) => Math.round((Math.floor(value) * 12 + Math.round((value % 1) * 10)) * 2.54);
  return (
    <section aria-label={t.bmi.inputs} className="surface grid content-start gap-7 rounded-2xl p-5 sm:p-7">
      <Segmented<Unit> label={t.bmi.units} value={unit} onChange={setUnit} options={[{ value: 'metric', label: 'cm · kg' }, { value: 'imperial', label: 'ft · lb' }]} />
      <Slider label={t.bmi.height} icon={Ruler} value={metric ? heightCm : Number(`${feet}.${inches}`)} min={metric ? 120 : 4} max={metric ? 210 : 7} step={metric ? 1 : 0.1} unit={metric ? 'cm' : `ft (${digits(`${feet}′${inches}″`, lang)})`} onChange={(value) => setHeightCm(metric ? value : fromFeet(value))} />
      <Slider label={t.bmi.weight} icon={Scale} value={metric ? weightKg : Math.round(weightKg * 2.20462)} min={metric ? 30 : 66} max={metric ? 160 : 350} step={1} unit={metric ? 'kg' : 'lb'} onChange={(value) => setWeightKg(metric ? value : Math.round(value / 2.20462))} />
      <p className="flex items-center gap-2 text-footnote text-muted-foreground">
        <Info size={16} /> {t.bmi.private}
      </p>
    </section>
  );
}

function Result({ heightCm, weightKg }: { heightCm: number; weightKg: number }) {
  const { t, num } = useI18n();
  const bmi = bmiOf(heightCm, weightKg);
  const band = bandOf(bmi);
  const meters = heightCm / 100;
  const color = BANDS.find((entry) => entry.band === band)?.tone ?? 'var(--leaf)';
  return (
    <section aria-live="polite" className="tone-ground grid justify-items-center gap-4 rounded-2xl p-5 text-center sm:p-7" style={tone(color)}>
      <BmiGauge bmi={bmi} />
      <p className="numeral -mt-2 text-[56px] font-bold leading-none">
        <Rolling text={num(bmi.toFixed(1))} /> <small className="text-callout font-semibold text-muted-foreground">BMI</small>
      </p>
      <p key={band} className="data-in text-title-2 font-bold" style={{ color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }}>
        {t.bmi.bands[band]}
      </p>
      <p className="max-w-[46ch] text-subhead text-muted-foreground">{t.bmi.sentences[band]}</p>
      <dl className="grid w-full gap-3 sm:grid-cols-2">
        <div className="surface rounded-xl p-3">
          <dt className="text-footnote text-muted-foreground">{t.bmi.healthyRange}</dt>
          <dd className="text-headline tabular-nums">{num(round1(18.5 * meters * meters))}–{num(round1(22.9 * meters * meters))} kg</dd>
        </div>
        <div className="surface rounded-xl p-3">
          <dt className="text-footnote text-muted-foreground">{t.bmi.worldScale}</dt>
          <dd className="text-headline">{t.bmi.bands[worldBand(bmi)]}</dd>
        </div>
      </dl>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-footnote">
        {BANDS.map((entry) => (
          <li key={entry.band} aria-current={entry.band === band ? 'true' : undefined} className="flex items-center gap-1.5 text-muted-foreground aria-[current=true]:font-semibold aria-[current=true]:text-foreground" style={tone(entry.tone)}>
            <i className="dot" /> {t.bmi.bands[entry.band]} <small>{t.bmi.ranges[entry.band]}</small>
          </li>
        ))}
      </ul>
      <Button icon={Sparkles} onClick={() => navigate('/plan')}>
        {t.home.build}
      </Button>
    </section>
  );
}

export default function Bmi() {
  const { t } = useI18n();
  const [heightCm, setHeightCm] = useState(160);
  const [weightKg, setWeightKg] = useState(62);
  return (
    <main className="page grid gap-10">
      <div>
        <h1 className="text-large-title">{t.bmi.title}</h1>
        <p className="mt-2 max-w-[60ch] text-callout text-muted-foreground">{t.bmi.lead}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Inputs heightCm={heightCm} weightKg={weightKg} setHeightCm={setHeightCm} setWeightKg={setWeightKg} />
        <Result heightCm={heightCm} weightKg={weightKg} />
      </div>
      <section className="surface-soft rounded-2xl p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-title-3">
          <Info size={20} /> {t.bmi.goodToKnow}
        </h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-callout">
          {t.bmi.notes.split('|').map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
      <Sources
        items={[
          { title: t.bmi.sourceWho, publisher: 'WHO Expert Consultation (The Lancet 363:157–163)', url: 'https://pubmed.ncbi.nlm.nih.gov/14726171/', year: 2004 },
          { title: t.bmi.sourceNhs, publisher: 'NHS', url: 'https://www.nhs.uk/health-assessment-tools/calculate-your-body-mass-index/calculate-bmi-for-adults', year: null },
        ]}
      />
    </main>
  );
}
