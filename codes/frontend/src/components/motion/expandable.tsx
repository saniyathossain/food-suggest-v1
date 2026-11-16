// A row of compact icon actions: each one opens into its label while the pointer is over it or it has focus, and folds again after, the way a
// toolbar does when it wants to cost no room until it is looked at. The icon alone is the whole control on touch (a tap does the action), and every
// button keeps its label as its accessible name whether it is drawn open or not. Only the width of the label and its opacity move.
import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import type { AppIcon } from '@/components/icons'
import { FAST, SPRING } from '@/components/motion/tokens'
import { BareButton } from '@/components/ui/bare-button'
import { cn } from '@/lib/utils'

export type ExpandableItem = Readonly<{
  id: string
  label: string
  icon: AppIcon
  onSelect: () => void
  disabled?: boolean | undefined
}>

type ActionProps = Readonly<{
  item: ExpandableItem
  open: boolean
  onOpen: (id: string | null) => void
}>

/** One action: the icon, and the label that unfolds beside it while `open`. */
function ExpandableAction({ item, open, onOpen }: ActionProps) {
  const Icon = item.icon
  return (
    <BareButton
      aria-label={item.label}
      disabled={item.disabled}
      data-open={open || undefined}
      onClick={item.onSelect}
      onPointerEnter={() => onOpen(item.id)}
      onPointerLeave={() => onOpen(null)}
      onFocus={() => onOpen(item.id)}
      onBlur={() => onOpen(null)}
      className={cn(
        'press surface inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border px-2 text-xs font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
      )}
    >
      <Icon aria-hidden />
      <AnimatePresence initial={false}>
        {open && (
          <m.span
            aria-hidden
            className="overflow-hidden whitespace-nowrap"
            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
            animate={{ width: 'auto', opacity: 1, marginLeft: 6, transition: { width: SPRING, marginLeft: SPRING, opacity: FAST } }}
            exit={{ width: 0, opacity: 0, marginLeft: 0, transition: FAST }}
          >
            {item.label}
          </m.span>
        )}
      </AnimatePresence>
    </BareButton>
  )
}

export function ExpandableActions({
  items,
  label,
  className,
}: Readonly<{ items: readonly ExpandableItem[]; label: string; className?: string | undefined }>) {
  const [active, setActive] = useState<string | null>(null)
  return (
    <div role="toolbar" aria-label={label} className={cn('flex items-center gap-1.5', className)}>
      {items.map(item => (
        <ExpandableAction key={item.id} item={item} open={active === item.id} onOpen={setActive} />
      ))}
    </div>
  )
}
