import * as React from 'react'
import * as S from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

/**
 * The iOS switch: a 46×28 track with a 24-point white thumb inset 2, a shadow under the thumb, and the thumb stretches to 28 while pressed
 * (and keeps its edge) before it springs across; the track's colour follows over 300 ms. Reads as a control on a phone and a desktop alike.
 */
export const Switch = React.forwardRef<React.ComponentRef<typeof S.Root>, React.ComponentPropsWithoutRef<typeof S.Root>>(
  ({ className, ...props }, ref) =>
      <S.Root
        ref={ref}
        className={cn(
          'group/switch peer relative inline-flex h-7 w-[2.875rem] shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-[background-color,box-shadow] duration-300 ease-[var(--ease-spring)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
          className,
        )}
        {...props}
      >
        <S.Thumb
          className={cn(
            'pointer-events-none block h-6 w-6 rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/0.22),0_0_1px_rgb(0_0_0/0.3)] ring-0',
            'transition-[transform,width] duration-[340ms] ease-[var(--ease-spring)]',
            'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[18px]',
            // pressed: the thumb stretches toward where it is going, keeping its far edge
            'group-active/switch:w-7 group-active/switch:data-[state=checked]:translate-x-[14px]',
            'group-disabled/switch:group-active/switch:w-6 group-disabled/switch:group-active/switch:data-[state=checked]:translate-x-[18px]',
          )}
        />
      </S.Root>
)
Switch.displayName = 'Switch'
