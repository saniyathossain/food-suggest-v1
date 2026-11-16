// How long something has lasted, counting up ("12s", then "1m 5s") with rolling digits (Shell Console's Elapsed), in the reader's language.
import { Rolling } from '@/components/kit/rolling';
import { secondsSince, useNow } from '@/lib/countdown';
import { duration, useI18n } from '@/lib/i18n';

export function Elapsed({ since, className }: Readonly<{ since: number; className?: string | undefined }>) {
  const { lang } = useI18n();
  return <Rolling text={duration(secondsSince(since, useNow()), lang)} forward className={className} />;
}
