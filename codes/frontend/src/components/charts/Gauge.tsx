// A semicircle gauge (FlavorFit's weight / calories tiles): a quiet track and a thick rounded arc for one share, 0–1. A meter, so
// it carries its value for assistive tech; the number itself is printed beside it by the caller. Pure SVG, no library.
const R = 40;
const LENGTH = Math.PI * R;

export function Gauge({ value, color, label, className }: { value: number; color: string; label: string; className?: string | undefined }) {
  const share = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 100 56" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} className={className}>
      <path d={`M10 50 A${R} ${R} 0 0 1 90 50`} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="9" strokeLinecap="round" />
      <path
        d={`M10 50 A${R} ${R} 0 0 1 90 50`}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={LENGTH}
        strokeDashoffset={LENGTH * (1 - share)}
        className="gauge-arc"
      />
    </svg>
  );
}
