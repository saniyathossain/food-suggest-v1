import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        avoid: 'border-transparent bg-avoid/12 text-avoid-ink',
        limit: 'border-transparent bg-limit/15 text-limit-ink',
        ok: 'border-transparent bg-ok/12 text-ok-ink',
        recommended: 'border-transparent bg-recommended/14 text-recommended-ink',
        idle: 'border-transparent bg-muted text-muted-foreground',
        season: 'border-transparent bg-[color-mix(in_srgb,var(--mango)_18%,transparent)] text-[color-mix(in_srgb,var(--mango)_45%,var(--foreground))]',
        glass: 'border-white/40 bg-white/80 text-[#13201a] backdrop-blur-md',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...props }: Readonly<BadgeProps>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
