// A disclosure: a trigger that carries the state (aria-expanded, a chevron that turns) and a panel that opens and folds with the shared Reveal.
// Three parts that share the state through context, so a page puts them where the design needs them: the trigger may be a row, a card header or
// a text button, and the panel anywhere inside the same Collapsible. Controlled (`open` + `onOpenChange`) or on its own (`defaultOpen`).
import { createContext, useContext, useId, useState, type ReactNode } from 'react'
import { m } from 'motion/react'
import { ChevronDown } from '@/components/icons'
import { FAST } from '@/components/motion/tokens'
import { Reveal } from '@/components/motion/presence'
import { BareButton } from '@/components/ui/bare-button'
import { cn } from '@/lib/utils'

type State = { open: boolean; toggle: () => void; panel: string }

const Disclosure = createContext<State | null>(null)

function useDisclosure(): State {
  const state = useContext(Disclosure)
  if (!state) throw new Error('A collapsible part is used outside a <Collapsible>.')
  return state
}

type RootProps = Readonly<{
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
  className?: string | undefined
}>

export function Collapsible({ open, defaultOpen = false, onOpenChange, children, className }: RootProps) {
  const [own, setOwn] = useState(defaultOpen)
  const panel = useId()
  const shown = open ?? own
  const toggle = () => {
    setOwn(!shown)
    onOpenChange?.(!shown)
  }
  return (
    <Disclosure.Provider value={{ open: shown, toggle, panel }}>
      <div className={className}>{children}</div>
    </Disclosure.Provider>
  )
}

/** The button that opens and folds the panel; `chevron={false}` for a trigger that draws its own sign. */
export function CollapsibleTrigger({
  children,
  className,
  chevron = true,
}: Readonly<{ children: ReactNode; className?: string | undefined; chevron?: boolean }>) {
  const { open, toggle, panel } = useDisclosure()
  return (
    <BareButton
      aria-expanded={open}
      aria-controls={panel}
      onClick={toggle}
      className={cn('press flex w-full cursor-pointer items-center gap-2 text-left', className)}
    >
      {children}
      {chevron && (
        <m.span
          aria-hidden
          className="ml-auto grid shrink-0 place-items-center"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={FAST}
        >
          <ChevronDown className="size-4" />
        </m.span>
      )}
    </BareButton>
  )
}

export function CollapsiblePanel({ children, className }: Readonly<{ children: ReactNode; className?: string | undefined }>) {
  const { open, panel } = useDisclosure()
  return (
    <Reveal show={open} className={className}>
      <div id={panel} role="region">
        {children}
      </div>
    </Reveal>
  )
}
