// Shown where a tier holds something back: what it is, and the way to the plans page.
import { Sparkles } from '@/components/icons';
import { useI18n } from '@/lib/i18n';
import { onLink } from '@/lib/router';
import { cn } from '@/lib/utils';

export function UpgradeCard({ text, className }: { text?: string | undefined; className?: string | undefined }) {
  const { t } = useI18n();
  return (
    <div className={cn('promo flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5', className)}>
      <p className="flex items-center gap-2 text-subhead font-semibold">
        <Sparkles size={18} /> {text ?? t.tiers.upgradeNeeded}
      </p>
      <a href="/pricing" onClick={onLink} className="press rounded-full bg-cta px-4 py-2 text-subhead font-semibold text-cta-ink">
        {t.tiers.upgrade}
      </a>
    </div>
  );
}
