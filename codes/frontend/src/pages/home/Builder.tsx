// Today's dense band, just under the hero: the three-step plan builder beside the water tracker, and the sticky "Build my plan" bar
// that appears once both the hero and the builder have scrolled away. Its own chunk: it sits below the fold.
import { Sparkles } from '@/components/icons';
import { SectionTitle } from '@/components/kit/section';
import { ProfileForm } from '@/components/ProfileForm';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap } from '@/lib/types';

export default function Builder({ boot }: { boot: Bootstrap }) {
  const { t } = useI18n();
  return (
    <>
      <section id="builder" aria-labelledby="builder-title" className="grid scroll-mt-28">
        <div className="surface rounded-[28px] p-5 sm:p-7">
          <SectionTitle icon={Sparkles} id="builder-title" title={t.landing.tryTitle} lead={t.home.builderLead} />
          <ProfileForm boot={boot} />
        </div>
      </section>
    </>
  );
}
