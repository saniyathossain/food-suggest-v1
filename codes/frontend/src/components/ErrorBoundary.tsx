// A render error shows a calm retry card instead of a blank page. Words are fixed in both languages because the i18n layer itself may
// be what failed. Code from an older build (after a deploy) reloads the page once; code that could not be downloaded (server down
// or restarting) is an outage, not a bug.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { OutageScreen } from '@/components/Outage';
import { suspectOutage } from '@/lib/outage';
import { reloadForNewBuild, STALE_CHUNK } from '@/lib/stale';

const CHUNK_FAILED = /Failed to fetch/i;

interface State {
  failed: boolean;
  outage: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false, outage: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : '';
    // code from an older build: reload onto the new one (once); if that already happened, show the outage screen
    if (STALE_CHUNK.test(message)) return { failed: true, outage: !reloadForNewBuild() };
    return { failed: true, outage: CHUNK_FAILED.test(message) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (this.state.outage) {
      suspectOutage();
      return;
    }
    console.error('[pathya] render failed', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    if (this.state.outage) return <OutageScreen />;
    return (
      <main className="page grid min-h-[70dvh] place-items-center">
        <div className="surface card-pad grid max-w-xl gap-4 rounded-2xl">
          <h1 className="text-title-1">Something went wrong · কিছু একটা সমস্যা হয়েছে</h1>
          <p className="text-callout text-muted-foreground">The page could not be shown. Your saved profile is safe. · পাতাটি দেখানো যায়নি। আপনার প্রোফাইল নিরাপদ আছে।</p>
          <button type="button" className="press shine h-11 w-fit cursor-pointer rounded-full bg-primary px-5 text-subhead font-semibold text-primary-foreground" onClick={() => location.reload()}>
            Reload · আবার চেষ্টা করুন
          </button>
        </div>
      </main>
    );
  }
}
