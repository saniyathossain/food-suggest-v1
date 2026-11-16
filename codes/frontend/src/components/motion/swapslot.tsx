// One piece of content swapped for another: the old one blurs and fades out while the new one blurs and fades in, in the same place (they
// share a grid cell, so nothing jumps). A label, an icon, a count, a title: whatever changes under one key. The first content is not animated;
// only a change is. Only opacity, blur and a small scale move.
import type { ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { BLUR, FAST } from '@/components/motion/tokens'
import { cn } from '@/lib/utils'

const HIDDEN = { opacity: 0, filter: `blur(${BLUR})`, scale: 0.94 }
const SHOWN = { opacity: 1, filter: 'blur(0px)', scale: 1 }

export function SwapSlot({ id, children, className }: Readonly<{ id: string | number; children: ReactNode; className?: string | undefined }>) {
  return (
    <span className={cn('inline-grid place-items-center', className)}>
      <AnimatePresence initial={false}>
        <m.span
          key={id}
          className="inline-flex min-w-0 max-w-full items-center gap-[inherit] [grid-area:1/1]"
          initial={HIDDEN}
          animate={SHOWN}
          exit={HIDDEN}
          transition={FAST}
        >
          {children}
        </m.span>
      </AnimatePresence>
    </span>
  )
}
