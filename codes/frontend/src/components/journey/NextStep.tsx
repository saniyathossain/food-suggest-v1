// The end of a page points at the next one: a calm card with what comes next and one obvious button, so no page is a dead end.
import { CalendarDays, type AppIcon } from '@/components/icons';
import { ArrowRight } from '@/components/icons/page';
import { buttonClass } from '@/components/ui/button-styles';
import { onLink } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

export function NextStep({ icon: Glyph, title, lead, href, label }: { icon: AppIcon; title: string; lead: string; href: string; label: string }) {
  const { t } = useI18n();
  return (
    <section aria-label={t.journey.next} className="next-step surface no-print flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[28px] p-5 sm:p-6">
      <span aria-hidden className="tile size-14 rounded-2xl [--tone:var(--primary)]">
        <Glyph size={26} />
      </span>
      <div className="min-w-0 flex-1 basis-60">
        <p className="eyebrow">{t.journey.next}</p>
        <h2 className="text-title-3 font-bold not-italic [font-family:var(--font-sans)]">{title}</h2>
        <p className="mt-0.5 text-subhead text-muted-foreground">{lead}</p>
      </div>
      <a href={href} onClick={onLink} className={buttonClass('default', 'lg')}>
        {label} <ArrowRight />
      </a>
    </section>
  );
}

/** The usual ending of a content page: a member goes to their plan, a visitor starts one. */
export function PlanNext({ kind }: { kind: 'condition' | 'food' | 'recipe' | 'article' }) {
  const { t } = useI18n();
  const auth = useAuth();
  const copy = t.journey.plan[kind];
  const member = auth.status === 'in';
  return <NextStep icon={CalendarDays} title={copy.title} lead={copy.lead} href={member ? '/plan' : '/register'} label={member ? copy.member : copy.guest} />;
}
