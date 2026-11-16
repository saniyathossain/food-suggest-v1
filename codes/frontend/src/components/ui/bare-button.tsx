// A button that brings no look of its own: the element for a control whose appearance the caller draws (a card that
// opens, a row that expands, a swatch). Every button the app renders is one of Button, IconButton or this, so what all
// buttons share is decided here: it is a plain button (never a submit) unless it is told otherwise, and it keeps the
// native focus ring. Use Button or IconButton when the control should look like one.

import * as React from 'react'

export type BareButtonProps = React.ComponentProps<'button'>

export const BareButton = React.forwardRef<HTMLButtonElement, BareButtonProps>(function BareButton({ type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} {...props} />
})
