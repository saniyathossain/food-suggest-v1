import * as React from 'react'
import * as C from '@radix-ui/react-checkbox'
import { Check } from '@/components/icons/page'
import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<React.ComponentRef<typeof C.Root>, React.ComponentPropsWithoutRef<typeof C.Root>>(
  ({ className, ...props }, ref) => (
    <C.Root
      ref={ref}
      className={cn(
        'press peer size-4 shrink-0 cursor-pointer rounded-[5px] border border-input bg-card shadow-xs transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <C.Indicator className="flex items-center justify-center text-current">
        <Check className="check-pop size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  ),
)
Checkbox.displayName = 'Checkbox'
