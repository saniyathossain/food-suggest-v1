// An empty list is a signpost, not a dead end: what is missing, why that is fine, and the one thing to do next (plus an optional
// second way out). Used wherever a search or a list can come back with nothing.
import type { AppIcon } from '@/components/icons';
import { buttonClass } from '@/components/ui/button-styles';
import { onLink } from '@/lib/router';

export interface Way {
  label: string;
  href?: string | undefined;
  onClick?: (() => void) | undefined;
}

function Action({ way, primary }: { way: Way; primary: boolean }) {
  const classes = buttonClass(primary ? 'default' : 'outline', 'default');
  if (way.href) {
    return (
      <a href={way.href} onClick={onLink} className={classes}>
        {way.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={way.onClick} className={classes}>
      {way.label}
    </button>
  );
}

export function EmptyState({ icon: Glyph, title, lead, primary, secondary }: { icon: AppIcon; title: string; lead?: string | undefined; primary?: Way | undefined; secondary?: Way | undefined }) {
  return (
    <div role="status" className="empty-state surface-soft grid justify-items-center gap-3 rounded-[28px] px-6 py-10 text-center sm:py-14">
      <span aria-hidden className="empty-orb grid size-16 place-items-center rounded-full text-primary">
        <Glyph size={28} />
      </span>
      <h3 className="text-title-3 font-bold">{title}</h3>
      {lead && <p className="max-w-[44ch] text-subhead text-muted-foreground">{lead}</p>}
      {(primary || secondary) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {primary && <Action way={primary} primary />}
          {secondary && <Action way={secondary} primary={false} />}
        </div>
      )}
    </div>
  );
}
