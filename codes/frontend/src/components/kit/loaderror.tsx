// A part that could not load: a calm card that says so and offers to try again (Shell Console's LoadError, Pathya's words).
import { RotateCw, TriangleAlert } from '@/components/icons';
import { buttonClass } from '@/components/ui/button-styles';
import { useI18n } from '@/lib/i18n';

export function ErrorBox({ message, onRetry }: Readonly<{ message?: string | undefined; onRetry?: (() => void) | undefined }>) {
  const { t } = useI18n();
  return (
    <div role="alert" className="surface flex flex-wrap items-center gap-4 rounded-xl p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-warning-soft text-limit-ink">
        <TriangleAlert size={20} />
      </span>
      <p className="min-w-0 flex-1 text-callout">{message ?? t.common.error}</p>
      <button type="button" className={buttonClass('outline', 'sm')} onClick={onRetry ?? (() => location.reload())}>
        <RotateCw /> {t.common.retry}
      </button>
    </div>
  );
}
