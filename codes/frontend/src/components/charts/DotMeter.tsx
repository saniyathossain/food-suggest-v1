// How much of a goal is done, as a row of small squares (Shell Console's DotMeter): the done ones filled in the given colour, the
// rest a faint track; each square fills a beat after the one before.
import { cn } from '@/lib/utils';

export function DotMeter({ used, limit, squares = 24, color, label, className }: Readonly<{ used: number; limit: number; squares?: number | undefined; color: string; label: string; className?: string | undefined }>) {
  if (limit <= 0) return null;
  const share = Math.min(1, used / limit);
  const filled = used > 0 ? Math.max(1, Math.round(share * squares)) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} className={cn('flex flex-wrap gap-0.5', className)}>
      {Array.from({ length: squares }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className="size-2.5 rounded-sm transition-colors duration-500 motion-reduce:transition-none"
          style={{ background: index < filled ? color : 'color-mix(in srgb, var(--foreground) 9%, transparent)', transitionDelay: `${index * 15}ms` }}
        />
      ))}
    </div>
  );
}
