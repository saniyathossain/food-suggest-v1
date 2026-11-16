// Told over everything when the server or its database is down, or this device is offline. The full card (live rows, a draining ring,
// how long it has lasted) is its own chunk, preloaded when the browser is idle; if the outage comes before that chunk could be
// fetched, a plain card says the same in a sentence and reloads when asked. Both are in the reader's language.
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { useOutage, type OutageKind } from '@/lib/outage';

const OutageCard = lazy(() => import('@/components/OutageCard'));

function PlainCard({ kind }: { kind: OutageKind }) {
  const { t } = useI18n();
  return (
    <main role="alert" className="surface grid w-full max-w-[520px] gap-3 rounded-2xl p-6">
      <h1 className="text-title-2">{t.outage[kind].title}</h1>
      <p className="text-subhead text-muted-foreground">{t.outage[kind].why}</p>
      <button type="button" onClick={() => location.reload()} className="press h-11 w-fit cursor-pointer rounded-full bg-primary px-5 text-subhead font-semibold text-primary-foreground">
        {t.outage.checkNow}
      </button>
      <p className="text-footnote text-muted-foreground">{t.outage.safe}</p>
    </main>
  );
}

/** The card's chunk could not be fetched (the server is the thing that is down): the plain card instead. */
class Fallback extends Component<{ plain: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.plain : this.props.children;
  }
}

export function OutageScreen() {
  const outage = useOutage();
  if (!outage) return null;
  const plain = <PlainCard kind={outage.kind} />;
  return (
    <div className="anim-fade fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm">
      <Fallback plain={plain}>
        <Suspense fallback={plain}>
          <OutageCard outage={outage} key={outage.since} />
        </Suspense>
      </Fallback>
    </div>
  );
}
