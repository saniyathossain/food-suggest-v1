// Sign in, create an account, forgot password, reset password: one calm card each. Field errors come from the API, under
// their field. After signing in you return to the page that sent you here (or your plan / the welcome steps).
import { useState, type FormEvent, type ReactNode } from 'react';
import { KeyRound } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, send } from '@/lib/api';
import { nextPath, signIn, signUp } from '@/lib/auth';
import { readPrefs } from '@/lib/prefs';
import { useI18n } from '@/lib/i18n';
import { navigate, onLink } from '@/lib/router';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string | undefined; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-footnote text-avoid-ink">
          {error}
        </p>
      ) : (
        hint && <p className="text-footnote text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export default function Auth({ mode }: { mode: AuthMode }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const titles: Record<AuthMode, [string, string]> = {
    login: [t.auth.signIn, t.auth.signInLead],
    register: [t.auth.signUp, t.auth.signUpLead],
    forgot: [t.auth.forgotTitle, t.auth.forgotLead],
    reset: [t.auth.resetTitle, ''],
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate(nextPath());
      } else if (mode === 'register') {
        const me = await signUp(name, email, password, lang);
        // choices made in the builder before signing up become the first profile, so the full plan is ready at once
        const draft = readPrefs().profile;
        if (draft) {
          const body = {
            name: me.name,
            relation: 'me',
            birth_year: new Date().getFullYear() - draft.age,
            gender: draft.gender,
            country: draft.country,
            pregnancy: 'none',
            mode: draft.mode ?? 'everyday',
            allergies: [],
            surgeries: [],
            conditions: draft.conditions.map((slug) => ({ slug })),
          };
          const saved = await send('/api/v1/me/profiles', 'POST', body).then(() => true).catch(() => false);
          navigate(saved ? nextPath('/plan') : '/welcome');
        } else {
          navigate('/welcome');
        }
      } else if (mode === 'forgot') {
        await send('/api/v1/auth/forgot', 'POST', { email });
        setDone(true);
      } else {
        await send('/api/v1/auth/reset', 'POST', { token: new URLSearchParams(location.search).get('token') ?? '', password });
        setDone(true);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) setErrors({ email: t.auth.tooMany });
      else if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else setErrors({ email: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };
  const [title, lead] = titles[mode];
  return (
    <main className="page grid min-h-[72dvh] place-items-center">
      <form onSubmit={(event) => void submit(event)} className="surface grid w-full max-w-md gap-5 rounded-3xl p-6 sm:p-8" noValidate>
        <span className="tone-soft grid size-14 place-items-center rounded-2xl [--tone:var(--violet)]">
          <KeyRound size={26} />
        </span>
        <div>
          <h1 className="text-title-1 font-bold">{title}</h1>
          {lead && <p className="mt-1 text-subhead text-muted-foreground">{lead}</p>}
        </div>
        {done ? (
          <p role="status" className="rounded-xl bg-primary-soft p-4 text-subhead">
            {mode === 'forgot' ? t.auth.forgotSent : t.auth.resetDone}
          </p>
        ) : (
          <>
            {mode === 'register' && (
              <Field id="name" label={t.auth.name} error={errors.name}>
                <Input id="name" placeholder={t.ph.name} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name) || undefined} />
              </Field>
            )}
            {mode !== 'reset' && (
              <Field id="email" label={t.auth.email} error={errors.email}>
                <Input id="email" placeholder={t.ph.email} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email) || undefined} />
              </Field>
            )}
            {mode !== 'forgot' && (
              <Field id="password" label={t.auth.password} hint={mode === 'login' ? undefined : t.auth.passwordHint} error={errors.password ?? errors.token}>
                <Input id="password" placeholder={mode === 'login' ? t.ph.password : t.ph.newPassword} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password) || undefined} />
              </Field>
            )}
            <Button type="submit" state={busy ? 'busy' : 'idle'} className="w-full justify-center">
              {mode === 'login' ? t.auth.signIn : mode === 'register' ? t.auth.signUp : mode === 'forgot' ? t.auth.send : t.auth.save}
            </Button>
          </>
        )}
        <div className="grid gap-1.5 text-subhead text-muted-foreground">
          {mode === 'login' && (
            <>
              <a href="/forgot" onClick={onLink} className="w-fit font-semibold text-primary">
                {t.auth.forgot}
              </a>
              <p>
                {t.auth.noAccount}{' '}
                <a href={`/register${location.search}`} onClick={onLink} className="font-semibold text-primary">
                  {t.auth.signUp}
                </a>
              </p>
            </>
          )}
          {mode !== 'login' && (
            <p>
              {t.auth.haveAccount}{' '}
              <a href="/login" onClick={onLink} className="font-semibold text-primary">
                {t.auth.signIn}
              </a>
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
