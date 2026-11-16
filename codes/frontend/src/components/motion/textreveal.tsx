// A line that arrives word by word: each word fades in and settles a few pixels, a beat after the one before (after the
// beui.dev text reveal). It plays when the line first shows and again whenever its words change — a status that turns from
// "all normal" to "3 critical" is read as news, not swapped in silence. Screen readers get the whole line at once; reduced
// motion shows it plainly. Words split on spaces, so any script that spaces its words (Bangla, Arabic, Latin) reveals the same.
import { m, useReducedMotion } from 'motion/react'
import { EASE } from '@/components/motion/tokens'

/** The pause between one word and the next, s. */
const STAGGER = 0.045

export function TextReveal({ text, className }: Readonly<{ text: string; className?: string | undefined }>) {
  const calm = useReducedMotion()
  if (calm) return <span className={className}>{text}</span>
  const words = text.split(/(\s+)/)
  return (
    <span key={text} className={className} aria-label={text}>
      {words.map((word, i) =>
        /^\s+$/.test(word) ? (
          word
        ) : (
          <m.span
            key={i}
            aria-hidden
            className="inline-block will-change-[transform,filter,opacity]"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: (i / 2) * STAGGER }}
          >
            {word}
          </m.span>
        ),
      )}
    </span>
  )
}
