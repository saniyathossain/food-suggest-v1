// The curves and springs every motion component shares, one definition: a component never writes its own easing.

/** Eases a page's elements: soft out-curve, short enough never to be waited on. */
export const EASE = [0.22, 1, 0.36, 1] as const
export const FAST = { duration: 0.2, ease: EASE }
/** Height opens and closes the way a disclosure does on iOS: a short ease-out with a gentle tail, over in a quarter of a second, so it is done
 *  before it can feel slow (a long, sharply decelerating curve spends most of its time creeping). Closing is quicker than opening. */
export const OPEN = { duration: 0.24, ease: [0.25, 0.8, 0.25, 1] as const }
export const CLOSE = { duration: 0.18, ease: [0.4, 0, 0.6, 1] as const }
/** A little bounce for what resizes or moves as one piece (the island, a control that opens): settles in about a third of a second. */
export const SPRING = { type: 'spring', stiffness: 420, damping: 32, mass: 0.85 } as const
/** How long a confirmation ("Saved") stays on a button before it goes back to rest, in ms. */
export const SETTLE_MS = 1600
/** How far content blurs while it swaps for other content. */
export const BLUR = '4px'
