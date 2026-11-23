// The profile builder as a guided three-step stepper: who you are → your conditions → go. A live line under it says what the plan
// will cover ("3 conditions · 24 foods to watch") as choices change. Saved on this device only (lib/prefs).
import { useState } from 'react';
import { Sparkles } from '@/components/icons';
import { ArrowLeft, ChevronRight } from '@/components/icons/page';
import { ConditionChoices, WhoStep } from '@/components/ProfileSteps';
import { Button } from '@/components/ui/button';
import { BuilderPreview } from '@/components/BuilderPreview';
import { PlanOverview } from '@/components/PlanOverview';
import { useAuth } from '@/lib/auth';
import { useI18n, useT } from '@/lib/i18n';
import { setPrefs, usePrefs } from '@/lib/prefs';
import { navigate } from '@/lib/router';
import type { Bootstrap, Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

const blank: Profile = { country: 'BD', age: 35, gender: 'female', conditions: [] };
const STEPS = ['who', 'conditions', 'go'] as const;
type Step = (typeof STEPS)[number];

function Preview({ boot, draft }: { boot: Bootstrap; draft: Profile }) {
  const translate = useT();
  const chosen = boot.conditions.filter((condition) => draft.conditions.includes(condition.slug));
  const watch = chosen.reduce((sum, condition) => sum + condition.counts.avoid + condition.counts.limit, 0);
  const text = chosen.length === 0 ? translate('profile.previewNone') : translate('profile.preview', chosen.length, watch);
  return (
    <p key={text} aria-live="polite" className="data-in text-subhead font-semibold text-primary">
      {text}
    </p>
  );
}

function StepDots({ step, onPick }: { step: Step; onPick: (step: Step) => void }) {
  const { t, num } = useI18n();
  const at = STEPS.indexOf(step);
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((name, index) => (
        <li key={name} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPick(name)}
            aria-current={name === step ? 'step' : undefined}
            className={cn('press inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-footnote font-semibold transition-colors', name === step ? 'bg-ink text-ink-foreground' : index < at ? 'bg-[var(--tint-mint)] text-[var(--tint-ink)]' : 'bg-muted text-muted-foreground hover:text-foreground')}
          >
            <span className="tabular-nums">{num(index + 1)}</span> {t.profile.steps[name]}
          </button>
          {index < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

export function ProfileForm({ boot, onDone, className, live = false }: { boot: Bootstrap; onDone?: () => void; className?: string | undefined; live?: boolean }) {
  const { t } = useI18n();
  const saved = usePrefs().profile;
  const [draft, setDraft] = useState<Profile>(saved ?? blank);
  const [step, setStep] = useState<Step>('who');
  const at = STEPS.indexOf(step);
  // signed out: step 3 shows the plan at a glance here (no account needed); the full plan is behind a free account
  const guest = useAuth().status !== 'in';
  const submit = () => {
    setPrefs({ profile: draft });
    if (onDone) {
      onDone();
      return;
    }
    navigate('/plan');
  };
  const move = (by: number) => {
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, at + by))] ?? 'who';
    if (next === 'go') setPrefs({ profile: draft });
    setStep(next);
  };
  return (
    <form
      id="profile-builder"
      className={cn('grid gap-5', live && 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-8', className)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid content-start gap-5">
      <StepDots step={step} onPick={(next) => { if (next === 'go') setPrefs({ profile: draft }); setStep(next); }} />
      <div key={step} className={cn('data-in', !live && 'min-h-[188px]')}>
        {step === 'who' && <WhoStep boot={boot} draft={draft} onChange={setDraft} />}
        {step === 'conditions' && <ConditionChoices boot={boot} draft={draft} onChange={setDraft} />}
        {step === 'go' && guest && <PlanOverview draft={draft} />}
        {step === 'go' && !guest && (
          <div className="grid gap-2">
            <h3 className="text-title-3">{t.profile.readyTitle}</h3>
            <p className="max-w-[52ch] text-subhead text-muted-foreground">{t.profile.readyLead}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Preview boot={boot} draft={draft} />
        <div className="flex gap-2">
          {at > 0 && (
            <Button variant="ghost" icon={ArrowLeft} onClick={() => move(-1)}>
              {t.profile.back}
            </Button>
          )}
          {step !== 'go' && (
            <Button variant="outline" icon={ChevronRight} onClick={() => move(1)}>
              {t.profile.next}
            </Button>
          )}
          {step === 'go' && !guest && (
            <Button type="submit" icon={Sparkles}>
              {t.home.build}
            </Button>
          )}
        </div>
      </div>
      </div>
      {live && <BuilderPreview boot={boot} draft={draft} />}
    </form>
  );
}
