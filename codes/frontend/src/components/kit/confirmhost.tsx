// The one place the confirm and notice dialogs are drawn: a frosted card (a bottom sheet on a phone) with a round icon in the tone of
// the question, the title, the explaining line, and two buttons, the safe one first and focused. Mounted once in App.
import { CircleAlert, Info } from '@/components/icons/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { answer, useAsk } from '@/lib/confirm';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ConfirmHost() {
  const { t } = useI18n();
  const open = useAsk();
  const danger = open?.tone === 'danger';
  return (
    <Dialog open={open !== null} onOpenChange={(next) => !next && answer(false)}>
      {open && (
        <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(event) => {
          // the safe button gets focus, never the destructive one
          event.preventDefault();
          (event.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-safe]')?.focus();
        }}>
          <div className="grid justify-items-center gap-3 pt-2 text-center">
            <span className={cn('grid size-14 place-items-center rounded-full', danger ? 'bg-avoid/15 text-avoid-ink' : 'bg-primary-soft text-primary')} aria-hidden>
              {danger ? <CircleAlert size={26} /> : <Info size={26} />}
            </span>
            <DialogTitle>{open.title}</DialogTitle>
            {open.body && <DialogDescription>{open.body}</DialogDescription>}
            {!open.body && <DialogDescription className="sr-only">{open.title}</DialogDescription>}
            {danger && <p className="text-footnote text-faint-foreground">{t.ask.cannotUndo}</p>}
          </div>
          <DialogFooter className="sm:justify-center">
            {open.notice ? (
              <Button data-safe onClick={() => answer(true)}>{open.action ?? t.ask.ok}</Button>
            ) : (
              <>
                <Button data-safe variant="outline" onClick={() => answer(false)}>{t.ask.cancel}</Button>
                <Button variant={danger ? 'destructive' : 'default'} onClick={() => answer(true)}>{open.action ?? (danger ? t.ask.delete : t.ask.yes)}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
