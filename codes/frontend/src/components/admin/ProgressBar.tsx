// An upload's progress: a thin brand line that grows (transform only).
export function ProgressBar({ value }: { value: number }) {
  return (
    <span className="lens-bar relative block h-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span className="lens-bar-fill absolute inset-0 origin-left transition-transform duration-300" style={{ transform: `scaleX(${value})` }} />
    </span>
  );
}
