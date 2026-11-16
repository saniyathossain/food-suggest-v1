// Shell Console's button (cva variants, a busy spinner and a done check that draws itself, the rolling label on
// hover), with Pathya's shapes: a pill, 44 px at the default size so it is easy to hit on a phone. The leading icon is given by the
// call site (Shell Console guesses one from an English label; Pathya's labels are bilingual, so it is explicit here). A link that
// looks like a button uses `buttonVariants` on the <a> (Shell Console's asChild/Slot is left out: it would put Radix in the first paint).
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader, type AppIcon } from '@/components/icons';
import { BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT } from '@/components/ui/button-styles';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(BUTTON_BASE, {
  variants: { variant: BUTTON_VARIANT, size: BUTTON_SIZE },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** the leading icon */
    icon?: AppIcon | undefined;
    /** what the action is doing: busy swaps the icon for a spinner and holds the button; done draws a check in its place */
    state?: 'idle' | 'busy' | 'done' | undefined;
  };

/** The label when the children are text only; null when they hold an element. */
function textOnly(children: React.ReactNode): string | null {
  let text = '';
  let plain = true;
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') text += child;
    else if (child !== null && child !== undefined && typeof child !== 'boolean') plain = false;
  });
  return plain && text.trim() ? text : null;
}

/** A check that draws itself: what a button shows for a moment when what it did has been done. */
function DoneMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="done-mark">
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}

function Leading({ state, Icon }: { state: 'idle' | 'busy' | 'done'; Icon: AppIcon | undefined }) {
  if (state === 'busy') return <Loader className="animate-spin" />;
  if (state === 'done') return <DoneMark />;
  if (!Icon) return null;
  return <Icon className="transition-transform duration-300 group-hover/btn:scale-110" />;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, icon, state = 'idle', children, disabled, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    const label = textOnly(children);
    return (
      <button
        className={classes}
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled || state === 'busy'}
        aria-busy={state === 'busy' || undefined}
        data-state={state}
        {...props}
      >
        <Leading state={state} Icon={icon} />
        {label ? (
          <span className="roll">
            <span className="roll-a">{label}</span>
            <span aria-hidden className="roll-b">
              {label}
            </span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';
