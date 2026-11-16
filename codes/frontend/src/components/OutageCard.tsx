// The outage card (Shell Console's outage page, Pathya's look), told over everything when the server or its database is down, or
// this device is offline: what is wrong, that nothing is lost, a live row per thing it waits for (kit StatusRow), a ring draining to the next check
// (kit CountdownRing; the pause doubles each time, 2 s → 60 s), how long it has lasted (kit Elapsed), and an automatic reload the
// moment /readyz answers. Its own chunk, fetched when the browser is idle after the first page (App.tsx), so it is here before it
// is needed; components/Outage.tsx has a plain fallback for the rare outage that comes first.
import { RotateCw, type AppIcon } from '@/components/icons';
import { Copy, Database, Globe, HardDrive, Server, WifiOff, Zap } from '@/components/icons/page';
import { useOutageChecks } from '@/components/useOutageChecks';
import { CountdownRing } from '@/components/kit/countdown';
import { Elapsed } from '@/components/kit/elapsed';
import { StatusRow, type CheckState } from '@/components/kit/statusrow';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/kit/toast';
import { useI18n } from '@/lib/i18n';
import type { Outage } from '@/lib/outage';

const KIND_ICON: Record<string, AppIcon> = { database: Database, cache: Zap, storage: HardDrive };

const stateOf = (up: boolean, checking: boolean): CheckState => {
  if (up) return 'ok';
  return checking ? 'checking' : 'bad';
};

function Card({ outage }: { outage: Outage }) {
  const { t, num } = useI18n();
  const { checks, kind, checking, tries, wait, check } = useOutageChecks(outage);
  const offline = kind === 'offline';
  const serverUp = checks.length > 0;
  const LeadIcon = offline ? WifiOff : kind === 'database' ? Database : Server;
  const details = [`Pathya outage · ${kind}`, new Date(outage.since).toISOString(), location.href, outage.requestId && `request ${outage.requestId}`].filter(Boolean).join('\n');
  const copy = () =>
    navigator.clipboard.writeText(details).then(() => toast(t.outage.copied));
  return (
    <main role="alert" className="surface card-pad w-full max-w-[520px] rounded-2xl shadow-lg">
      <div className="flex items-start gap-4">
        <span className="tone-soft grid size-14 shrink-0 place-items-center rounded-xl [--tone:var(--coral)]">
          <LeadIcon size={28} />
        </span>
        <div>
          <h1 className="text-title-2">{t.outage[kind].title}</h1>
          <p className="mt-1.5 text-subhead text-muted-foreground">{t.outage[kind].why}</p>
        </div>
      </div>
      <ul className="well mt-5 divide-y overflow-hidden">
        <StatusRow icon={Globe} label={t.outage.you} state={stateOf(!offline, checking)} note={offline ? t.outage.notAnswering : t.outage.answering} />
        <StatusRow icon={Server} label={t.outage.serverRow} state={stateOf(serverUp, checking)} note={serverUp ? t.outage.answering : t.outage.notAnswering} />
        {checks.map((item) => (
          <StatusRow
            key={item.kind}
            icon={KIND_ICON[item.kind] ?? Server}
            label={`${t.outage.kinds[item.kind as keyof typeof t.outage.kinds] ?? item.kind} · ${item.name}`}
            state={stateOf(item.up, checking)}
            note={item.up ? t.outage.answering : item.critical ? t.outage.needed : t.outage.optional}
          />
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <CountdownRing until={wait.until} total={wait.total} label={checking ? t.outage.checking : t.outage.nextCheck} format={(seconds) => num(seconds)} />
        <dl className="grid gap-1 text-subhead">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t.outage.downFor}</dt>
            <dd className="font-semibold">
              <Elapsed since={outage.since} />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t.outage.checks}</dt>
            <dd className="font-semibold tabular-nums">{num(tries)}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <ActionButton icon={RotateCw} onClick={check}>
          {t.outage.checkNow}
        </ActionButton>
        <Button variant="outline" icon={Copy} onClick={() => void copy().catch(() => undefined)}>
          {t.outage.copy}
        </Button>
      </div>
      <p className="mt-5 text-footnote text-muted-foreground">{t.outage.safe}</p>
    </main>
  );
}

export default Card;
