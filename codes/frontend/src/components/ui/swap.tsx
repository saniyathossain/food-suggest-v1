// An icon that is swapped for another (eye / eye-off, copy / check, play / pause) pops in on a spring instead of blinking. The first icon a
// control shows is not animated; only a change is.
import * as React from 'react'
import type { AppIcon } from '@/components/icons'

/** A name for an icon, to tell one from another. */
const nameOf = (icon: AppIcon) => (icon as { displayName?: string }).displayName ?? 'icon'

export function Swap({ icon: Icon, className, ...props }: { icon: AppIcon } & React.ComponentProps<AppIcon>) {
  const name = nameOf(Icon)
  const [shown, setShown] = React.useState({ name, animate: false })
  // a change of icon starts the animation once, and keeps it for as long as that icon stays
  if (shown.name !== name) setShown({ name, animate: true })
  return (
    <span key={name} className={shown.animate ? 'swap-in inline-grid place-items-center' : 'inline-grid place-items-center'}>
      <Icon aria-hidden className={className} {...props} />
    </span>
  )
}
