// Today's tip: one habit from the plan for the saved profile (or general guidance without one), picked by the date, on an
// aubergine card.
import { Icon } from '@/components/icons';
import { Lightbulb } from '@/components/icons/page';
import { Bone, TextBone } from '@/components/kit/bones';
import { useI18n } from '@/lib/i18n';
import { pickForToday, usePlan } from '@/lib/plan';
import { usePrefs } from '@/lib/prefs';
import type { Profile } from '@/lib/types';

const GENERAL: Profile = { country: 'BD', age: 35, gender: 'female', conditions: [] };

export function Tip() {
  const { t, lang } = useI18n();
  const { profile } = usePrefs();
  const { data, error } = usePlan(profile ?? GENERAL, lang);
  if (error) return null;
  const habit = pickForToday(data?.habits ?? []);
  if (data && !habit) return null;
  return (
    <aside aria-labelledby="tip-title" className="tone-ground flex gap-5 rounded-2xl p-6 [--tone:var(--aubergine)] sm:p-8">
      <span className="tone-soft grid size-14 shrink-0 place-items-center rounded-xl [--tone:var(--aubergine)]">
        {habit ? <Icon name={habit.icon} size={28} /> : <Lightbulb size={28} />}
      </span>
      <div className="grid min-w-0 gap-1.5">
        <h2 id="tip-title" className="text-footnote font-semibold text-muted-foreground">{t.home.tip}</h2>
        {!habit && (
          <>
            <Bone className="h-6 w-2/3" />
            <TextBone />
          </>
        )}
        {habit && <p className="text-title-3 font-semibold">{habit.title}</p>}
        {habit && <p className="max-w-[70ch] text-subhead text-muted-foreground">{habit.detail}</p>}
      </div>
    </aside>
  );
}
