// A pill that is one object whatever it shows: when its view changes, the old content blurs out, the new blurs in, and the pill springs to the
// size of the new one (width and height measured from the content, never guessed; the outgoing view leaves the flow while it fades, so only the new one sizes the pill), instead of one box vanishing and another appearing. A view is
// whatever the caller puts inside under one `view` key (a count and two buttons, then a spinner, then a check). The shell's looks (glass, border,
// shadow) come from the caller; this keeps only the motion and the clipping.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m, useIsPresent } from 'motion/react'
import { BLUR, FAST, SPRING } from '@/components/motion/tokens'
import { cn } from '@/lib/utils'

type Size = Readonly<{ width: number; height: number }>

const HIDDEN = { opacity: 0, filter: `blur(${BLUR})`, scale: 0.96 }
const SHOWN = { opacity: 1, filter: 'blur(0px)', scale: 1 }

type ViewProps = Readonly<{ id: string; onSize: (size: Size) => void; children: ReactNode }>

/** One view of the island; while it is the present one it tells the shell how big it is, and again whenever that changes (text wrapping, a counter growing). */
function IslandView({ id, onSize, children }: ViewProps) {
  const box = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  useLayoutEffect(() => {
    const node = box.current
    if (!node || !present) return
    const measure = () => onSize({ width: Math.ceil(node.offsetWidth), height: Math.ceil(node.offsetHeight) })
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(node)
    return () => watcher.disconnect()
  }, [present, onSize])
  return (
    <m.div
      key={id}
      ref={box}
      className={cn('w-max max-w-[calc(100vw-2rem)]', !present && 'absolute left-0 top-0')}
      initial={HIDDEN}
      animate={SHOWN}
      exit={{ ...HIDDEN, transition: FAST }}
      transition={FAST}
    >
      {children}
    </m.div>
  )
}

export function DynamicIsland({ view, children, className }: Readonly<{ view: string; children: ReactNode; className?: string | undefined }>) {
  const [size, setSize] = useState<Size | null>(null)
  return (
    <m.div
      className={cn('relative box-content max-w-full overflow-hidden', className)}
      initial={false}
      animate={{ width: size?.width ?? 'auto', height: size?.height ?? 'auto' }}
      transition={SPRING}
    >
      <AnimatePresence initial={false}>
        <IslandView key={view} id={view} onSize={setSize}>
          {children}
        </IslandView>
      </AnimatePresence>
    </m.div>
  )
}
