// The first two steps of the profile builder: who (country, age, gender) and which conditions.
import { Flag } from '@/components/kit/flag';
import { Icon, type AppIcon } from '@/components/icons';
import { Cake, MapPin, Stethoscope, UserRound } from '@/components/icons/page';
import { Counter } from '@/components/kit/counter';
import { Segmented } from '@/components/ui/segmented';
import { useI18n } from '@/lib/i18n';
import type { Bootstrap, Gender, Profile } from '@/lib/types';
import { tone } from '@/lib/utils';
import type { ReactNode } from 'react';

type StepProps = { boot: Bootstrap; draft: Profile; onChange: (next: Profile) => void };

function Field({ icon: Glyph, label, htmlFor, children }: { icon: AppIcon; label: string; htmlFor?: string; children: ReactNode }) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <div className="grid content-start gap-2">
      <Tag {...(htmlFor ? { htmlFor } : {})} className="flex items-center gap-1.5 text-footnote font-semibold text-muted-foreground">
        <Glyph size={16} /> {label}
      </Tag>
      {children}
    </div>
  );
}

export function WhoStep({ boot, draft, onChange }: StepProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-5">
      <Field icon={MapPin} label={t.profile.country}>
        <Segmented label={t.profile.country} value={draft.country} onChange={(country) => onChange({ ...draft, country })} options={boot.countries.map((country) => ({ value: country.code, label: <span className="inline-flex items-center gap-2"><Flag code={country.code} /> {country.name}</span> }))} />
      </Field>
      <Field icon={Cake} label={t.profile.age} htmlFor="age">
        <Counter id="age" label={t.profile.age} value={draft.age} min={1} max={120} onChange={(age) => onChange({ ...draft, age })} />
      </Field>
      <Field icon={UserRound} label={t.profile.gender}>
        <Segmented<Gender> label={t.profile.gender} value={draft.gender} onChange={(gender) => onChange({ ...draft, gender })} options={boot.genders.map((gender) => ({ value: gender, label: t.gender[gender] }))} />
      </Field>
    </div>
  );
}

export function ConditionChoices({ boot, draft, onChange }: StepProps) {
  const { t } = useI18n();
  const toggle = (slug: string) => {
    const has = draft.conditions.includes(slug);
    onChange({ ...draft, conditions: has ? draft.conditions.filter((item) => item !== slug) : [...draft.conditions, slug] });
  };
  return (
    <Field icon={Stethoscope} label={t.profile.conditions}>
      <div className="flex flex-wrap gap-2">
        {boot.conditions.map((condition) => (
          <button key={condition.slug} type="button" className="chip press cursor-pointer" aria-pressed={draft.conditions.includes(condition.slug)} onClick={() => toggle(condition.slug)} style={{ ...tone(condition.color), '--chip-fg': condition.color } as React.CSSProperties}>
            <span className="tile size-7 rounded-full">
              <Icon name={condition.icon} size={15} />
            </span>
            {condition.name}
          </button>
        ))}
      </div>
      <small className="text-footnote text-muted-foreground">{t.profile.conditionsHint}</small>
    </Field>
  );
}
