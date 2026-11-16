// The BMI gauge: a half circle of the four Asian bands, a needle that swings to the value on a spring (CSS rotate), the hub.
import { BANDS, SCALE_MAX, SCALE_MIN } from '@/lib/bmi';

function polar(value: number, radius: number): [number, number] {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));
  const angle = Math.PI * (1 - (clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN));
  return [120 + radius * Math.cos(angle), 120 - radius * Math.sin(angle)];
}

function arc(from: number, to: number, radius: number): string {
  const [x1, y1] = polar(from, radius);
  const [x2, y2] = polar(to, radius);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}

export function BmiGauge({ bmi }: { bmi: number }) {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, bmi));
  const turn = ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 180 - 90;
  return (
    <svg viewBox="0 0 240 132" className="w-full max-w-[320px]" role="img" aria-hidden>
      {BANDS.map((entry) => (
        <path key={entry.band} d={arc(entry.from + 0.15, entry.to - 0.15, 100)} stroke={entry.tone} strokeWidth="18" fill="none" strokeLinecap="round" />
      ))}
      <line x1="120" y1="120" x2="120" y2="44" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" className="origin-[120px_120px] transition-[rotate] duration-700 ease-[var(--ease-bounce)] motion-reduce:transition-none" style={{ rotate: `${turn}deg` }} />
      <circle cx="120" cy="120" r="9" fill="var(--foreground)" />
      <circle cx="120" cy="120" r="3.5" fill="var(--card)" />
    </svg>
  );
}
