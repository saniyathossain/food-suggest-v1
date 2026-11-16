import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Close } from '@/components/icons'
import { cn } from '@/lib/utils'
import { setNonce } from 'get-nonce'
import { t } from '@/lib/i18n'

// A modal Radix dialog locks the page's scroll by writing a <style> element (react-remove-scroll), which a strict style-src refuses.
// Shell Console's answer: hand that element the page's CSP nonce (get-nonce). The server must print it into
// <meta name="csp-nonce" content="…"> and allow 'nonce-…' in style-src; until it does, open dialogs with modal={false}.
const nonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content')
if (nonce) setNonce(nonce)

export const Dialog = DialogPrimitive.Root

/** How far down a finger must drag the sheet's handle, or how fast, for it to close (phones only). */
const DISMISS_PX = 110
const DISMISS_SPEED = 0.7

/**
 * A dialog: a centred card from 640px up, and on a phone a bottom sheet — it rises from the edge, wears a grab handle and follows a finger
 * dragged down it, closing when let go past a third of the way or flicked.
 */
export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { wide?: boolean | undefined }
>(({ className, children, wide, ...props }, ref) => {
  const sheet = React.useRef<HTMLDivElement | null>(null)
  const close = React.useRef<HTMLButtonElement>(null)
  const drag = React.useRef<{ from: number; at: number; moved: number } | null>(null)
  const setRefs = (node: HTMLDivElement | null) => {
    sheet.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  const follow = (offset: number, animate: boolean) => {
    const element = sheet.current
    if (!element) return
    element.style.transition = animate ? 'transform 260ms var(--ease-spring)' : 'none'
    element.style.transform = offset === 0 ? '' : `translate3d(0, ${offset}px, 0)`
  }
  const grab = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { from: event.clientY, at: event.timeStamp, moved: 0 }
  }
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    // pulled down follows the finger; pulled up resists, as a sheet on a phone does
    const raw = event.clientY - drag.current.from
    drag.current.moved = raw > 0 ? raw : raw / 6
    follow(drag.current.moved, false)
  }
  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current
    drag.current = null
    if (!held) return
    const speed = held.moved / Math.max(1, event.timeStamp - held.at)
    if (held.moved < DISMISS_PX && speed < DISMISS_SPEED) return follow(0, true)
    // already where the finger left it: closed from there, with no second animation
    sheet.current?.setAttribute('data-dragged', 'true')
    follow(sheet.current?.offsetHeight ?? 600, true)
    window.setTimeout(() => close.current?.click(), 160)
  }
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="anim-fade fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        ref={setRefs}
       
        className={cn(
          'anim-modal glass glass-dense fixed z-50 grid gap-4 overflow-y-auto overscroll-contain p-6',
          // a phone: a sheet on the bottom edge, clear of the home indicator
          'inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-3xl border-b-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
          // from 640px: a card in the middle
          'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border-b sm:pb-6',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          className="absolute inset-x-0 top-0 z-10 flex h-7 touch-none cursor-grab items-center justify-center sm:hidden"
        >
          <span className="h-1 w-9 rounded-full bg-foreground/20" />
        </div>
        {children}
        <DialogPrimitive.Close
          ref={close}
          className="press absolute right-4 top-6 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer sm:top-4"
        >
          <Close className="size-4" />
          <span className="sr-only">{t('kit.dialog.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = 'DialogContent'
export const DialogHeader = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 pr-6', className)} {...rest} />
)
export const DialogFooter = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...rest} />
)
export const DialogTitle = ({ className, ...rest }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title className={cn('text-title-3 font-semibold', className)} {...rest} />
)
export const DialogDescription = ({ className, ...rest }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description className={cn('text-subhead text-muted-foreground', className)} {...rest} />
)
