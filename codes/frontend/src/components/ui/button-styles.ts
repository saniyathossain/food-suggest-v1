// The button's looks as plain class strings: button.tsx builds its cva variants from these, and the two first-paint places that only
// need a link styled as a button (Today's hero, the boot error) use them directly, so cva and the Button component stay out of the
// first bundle.
export const BUTTON_BASE =
  'press group/btn inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0';

export const BUTTON_VARIANT = {
  // the sunny call to action (FlavorFit): butter yellow, dark ink; green is kept for verdicts and links
  default: 'shine bg-cta text-cta-ink shadow-[var(--lift-sun-sm)] hover:bg-cta-hover hover:shadow-[var(--lift-sun)]',
  brand: 'shine bg-primary text-primary-foreground shadow-[var(--lift-sm)] hover:bg-primary/92 hover:shadow-[var(--lift)]',
  destructive: 'bg-avoid text-white shadow-sm hover:bg-avoid/90',
  outline: 'border border-border bg-card text-foreground shadow-xs hover:border-foreground/25 hover:bg-muted',
  secondary: 'bg-muted text-foreground hover:bg-accent',
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  glass: 'border border-white/50 bg-white/85 text-[#13201a] shadow-md backdrop-blur-md hover:bg-white',
  link: 'text-primary underline-offset-4 hover:underline',
};

export const BUTTON_SIZE = {
  default: 'h-11 px-5 text-subhead [&_svg]:size-[18px]',
  sm: 'h-9 px-4 text-footnote [&_svg]:size-4',
  lg: 'h-12 px-6 text-callout [&_svg]:size-5',
  icon: 'size-11 [&_svg]:size-5',
};

/** A link or plain button with the button's look, without the Button component. */
export const buttonClass = (variant: keyof typeof BUTTON_VARIANT = 'default', size: keyof typeof BUTTON_SIZE = 'default'): string =>
  `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]}`;

export const ICON_SIZE = { sm: 'size-9 [&_svg]:size-4', md: 'size-11 [&_svg]:size-5' };
export const ICON_TONE = {
  ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  soft: 'bg-muted text-foreground hover:bg-accent',
  solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
  danger: 'text-muted-foreground hover:bg-danger-soft hover:text-avoid-ink',
  confirm: 'bg-avoid text-white hover:bg-avoid/90',
};

/** An icon-only control's shape and colours (IconButton, and a link drawn as one). */
export const iconButtonClass = (size: keyof typeof ICON_SIZE, tone: keyof typeof ICON_TONE, className?: string): string =>
  `press relative grid shrink-0 cursor-pointer place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 ${ICON_SIZE[size]} ${ICON_TONE[tone]} ${className ?? ''}`;
