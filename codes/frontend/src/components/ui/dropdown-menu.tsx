import * as React from 'react'
import * as M from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export const DropdownMenu = M.Root
export const DropdownMenuTrigger = M.Trigger
export const DropdownMenuContent = React.forwardRef<React.ComponentRef<typeof M.Content>, React.ComponentPropsWithoutRef<typeof M.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <M.Portal>
      <M.Content
        ref={ref}
        sideOffset={sideOffset}
       
        className={cn(
          'anim-pop glass glass-dense z-50 min-w-[11rem] overflow-hidden rounded-2xl p-1.5 text-popover-foreground',
          className,
        )}
        {...props}
      />
    </M.Portal>
  ),
)
DropdownMenuContent.displayName = 'DropdownMenuContent'
export const DropdownMenuItem = ({ className, ...rest }: React.ComponentPropsWithoutRef<typeof M.Item>) => (
  <M.Item
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-2.5 py-2 text-subhead font-semibold outline-none transition-colors duration-150 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4',
      className,
    )}
    {...rest}
  />
)
export const DropdownMenuLabel = ({ className, ...rest }: React.ComponentPropsWithoutRef<typeof M.Label>) => (
  <M.Label className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...rest} />
)
export const DropdownMenuSeparator = ({ className, ...rest }: React.ComponentPropsWithoutRef<typeof M.Separator>) => (
  <M.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...rest} />
)
