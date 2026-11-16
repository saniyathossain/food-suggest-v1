// A button whose action takes a moment (Shell Console's ActionButton): while the promise runs it shows a spinner and holds itself;
// when it resolves it draws a check for a moment, then rests. A failure goes back to rest at once (the caller tells the reader why).
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { SETTLE_MS } from '@/components/motion/tokens';
import { Button } from '@/components/ui/button';

type Props = Omit<ComponentProps<typeof Button>, 'onClick' | 'state'> & { onClick: () => Promise<unknown> };

export function ActionButton({ onClick, ...props }: Props) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = () => {
    setState('busy');
    onClick()
      .then(() => {
        setState('done');
        timer.current = window.setTimeout(() => setState('idle'), SETTLE_MS);
      })
      .catch(() => setState('idle'));
  };
  return <Button {...props} state={state} onClick={run} />;
}
