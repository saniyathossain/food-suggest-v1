// Soothing transitions for what appears and disappears. Built on `motion`
// (LazyMotion + the small `m` components: about 5 KB, loaded after first
// paint) — a banner, a notice or a panel eases in and out instead of
// snapping. Only opacity and transform move, plus height while something
// opens or closes, and nothing moves for people who ask for reduced motion
// (MotionConfig reducedMotion="user"). Pages never wait on an animation:
// content is in the DOM at once, the transition is dressing.
import type { ReactNode } from 'react'
import { AnimatePresence, LazyMotion, MotionConfig, m } from 'motion/react'
import { CLOSE, EASE, FAST, OPEN } from '@/components/motion/tokens'
import { cn } from '@/lib/utils'

const features = () => import('@/components/motion/features').then(result => result.default)

/** Wraps the app once: loads the motion features lazily and honours reduced motion. */
export function MotionRoot({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/**
 * Shows children while `show`: opens from nothing (height and opacity) and
 * folds away again, instead of appearing and vanishing. `initial={false}`:
 * what is there on first render is simply there.
 */
export function Reveal({
  show,
  children,
  className,
  bleed,
  onClosed,
}: Readonly<{
  show: boolean
  children: ReactNode
  className?: string | undefined
  bleed?: boolean | undefined
  /** when it has folded away completely (what holds it may let go of the room it lent) */
  onClosed?: (() => void) | undefined
}>) {
  return (
    <AnimatePresence initial={false} {...(onClosed ? { onExitComplete: onClosed } : {})}>
      {show && (
        <m.div
          // `bleed`: room for what is drawn outside its children (a chip's shadow) while the box clips to animate: padding that a negative margin takes back, so nothing moves
          className={cn(bleed && '-mx-1.5 -mb-2 -mt-1 px-1.5 pb-2 pt-1', className)}
          style={{ overflow: 'hidden' }}
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: 'auto',
            transitionEnd: { overflow: 'visible' },
            transition: { height: OPEN, opacity: { duration: 0.16, ease: EASE } },
          }}
          exit={{ opacity: 0, height: 0, overflow: 'hidden', transition: { height: CLOSE, opacity: { duration: 0.12, ease: EASE } } }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
}

/** Fades and lifts children in when they first appear or when `id` changes (content replacing a skeleton). */
export function FadeIn({ id, children, className }: Readonly<{ id?: string | number; children: ReactNode; className?: string | undefined }>) {
  return (
    <m.div key={id} className={className} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={FAST}>
      {children}
    </m.div>
  )
}

/** A list whose items ease in and out as they come and go (keys decide who is who). */
export function PresenceList({ children }: Readonly<{ children: ReactNode }>) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>
}

/** One item of a PresenceList. */
export function Item({ children, className }: Readonly<{ children: ReactNode; className?: string | undefined }>) {
  return (
    <m.div
      className={className}
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={FAST}
    >
      {children}
    </m.div>
  )
}
