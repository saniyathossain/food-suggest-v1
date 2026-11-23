import * as React from 'react'
import * as T from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = T.Provider
export function Tip({
  children,
  content,
  side = 'top',
}: Readonly<{
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}>) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className={cn(
            'anim-pop z-50 max-w-xs rounded-lg bg-ink px-2.5 py-1.5 text-footnote text-ink-foreground shadow-md',
          )}
        >
          {content}
          <T.Arrow className="fill-foreground" width={10} height={5} />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
