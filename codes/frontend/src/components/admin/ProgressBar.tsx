// An upload's progress: a thin brand line that grows (transform only).
export function ProgressBar({ value }: { value: number }) {
  return (
    <span className="relative block h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span className="absolute inset-0 origin-left rounded-full bg-brand transition-transform duration-300" style={{ transform: `scaleX(${value})` }} />
    </span>
  );
}
