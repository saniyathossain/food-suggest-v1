// A segmented choice (iOS / macOS): a sunk track, the chosen option a raised white thumb. One group, aria-pressed on each option.
import type { ReactNode } from 'react';
import { LiquidPill, useLiquid } from '@/components/kit/liquid';
import { cn } from '@/lib/utils';

export interface SegmentOption<Value extends string> {
  value: Value;
  label: ReactNode;
  /** the accessible name when the label is only an icon */
  name?: string | undefined;
}

export function Segmented<Value extends string>({
  options,
  value,
  onChange,
  size,
  label,
  className,
}: {
  options: SegmentOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  size?: 'sm' | 'lg' | undefined;
  label: string;
  className?: string | undefined;
}) {
  const liquid = useLiquid<HTMLDivElement>(value);
  return (
    <div ref={liquid.host} data-liquid className={cn('seg liquid-host', size === 'sm' && 'seg-sm', size === 'lg' && 'seg-lg', className)} role="group" aria-label={label}>
      <LiquidPill pill={liquid.pill} />
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} aria-label={option.name} title={option.name} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
