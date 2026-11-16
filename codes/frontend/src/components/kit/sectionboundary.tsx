// A part of a page that throws shows this small note in its own place; the rest of the page keeps working (Shell Console's
// SectionBoundary). "Try again" draws the part again. A chunk that could not be downloaded is an outage, not a bug.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCw, TriangleAlert } from '@/components/icons';
import { t } from '@/lib/i18n';
import { suspectOutage } from '@/lib/outage';
import { cn } from '@/lib/utils';

type Props = Readonly<{ children: ReactNode; resetKey?: string | undefined; inline?: boolean | undefined }>;
type State = { failed: boolean; resetKey: string | undefined };

const CHUNK_FAILED = /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i;

export class SectionBoundary extends Component<Props, State> {
  override state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (CHUNK_FAILED.test(error.message)) {
      suspectOutage();
      return;
    }
    console.error('[pathya] section failed', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className={cn('flex flex-wrap items-center gap-3 text-subhead', this.props.inline ? 'p-4' : 'surface card-pad rounded-xl')}>
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-danger-soft text-avoid-ink">
          <TriangleAlert size={18} />
        </span>
        <p className="min-w-0 flex-1 text-muted-foreground">{t('kit.section.failed')}</p>
        <button type="button" className="press inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-footnote font-semibold hover:bg-accent" onClick={() => this.setState({ failed: false })}>
          <RotateCw size={16} /> {t('kit.section.retry')}
        </button>
      </div>
    );
  }
}
