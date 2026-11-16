// A light that travels the border of what it wraps (Shell Console's Beam; CSS only, no inline <style>, so the strict CSP is happy).
// It rests until it is wanted (pointed at, focused, or asked for) and does not move for a reader who asked for less motion.
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BeamProps = Readonly<{ children: ReactNode; when?: 'attention' | 'always' | 'on' | undefined; on?: boolean | undefined; className?: string | undefined }>;

export function Beam({ children, when = 'attention', on = false, className }: BeamProps) {
  const [near, setNear] = useState(false);
  const lit = when === 'always' || (when === 'on' ? on : near);
  return (
    <div
      className={cn('beam min-w-0', className)}
      data-lit={lit || undefined}
      onPointerEnter={() => setNear(true)}
      onPointerLeave={() => setNear(false)}
      onFocusCapture={() => setNear(true)}
      onBlurCapture={() => setNear(false)}
    >
      {children}
    </div>
  );
}
