// The app's motion components (Shell Console's layer), one module per concern. Import from '@/components/motion', never from a module
// file directly. Every curve and spring is in tokens.ts. motion/react lives in lazy chunks only: a page that uses these wraps itself
// in <MotionRoot> (pages/* are lazy), so the first paint never waits for it.
//   presence    — MotionRoot, Reveal, FadeIn, PresenceList, Item: what appears and disappears
//   swapslot    — one piece of content swapped for another with a blur crossfade
//   textreveal  — a line that arrives word by word
//   collapsible, expandable, island — compound controls built on the two above
export { EASE, FAST, OPEN, CLOSE, SPRING, BLUR } from '@/components/motion/tokens';
export { MotionRoot, Reveal, FadeIn, PresenceList, Item } from '@/components/motion/presence';
export { SwapSlot } from '@/components/motion/swapslot';
export { TextReveal } from '@/components/motion/textreveal';
export { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/motion/collapsible';
export { ExpandableActions, type ExpandableItem } from '@/components/motion/expandable';
export { DynamicIsland } from '@/components/motion/island';
