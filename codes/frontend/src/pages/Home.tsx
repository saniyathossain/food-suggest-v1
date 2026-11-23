// Today. Signed out: the public front page (pages/home/Landing: hero, how it works, try the builder, recipes, reading, a sign-up
// band). Signed in: the person's own dashboard (pages/home/Dashboard: schedule, next meal, report tiles, their eat-more list,
// their plan card) — built from their saved plan. While the session is checked, this device's last answer picks the page.
import { useAuth, wasSignedIn } from '@/lib/auth';
import type { Bootstrap } from '@/lib/types';
import { Dashboard } from './home/Dashboard';
import { Landing } from './home/Landing';

export default function Home({ boot }: { boot: Bootstrap }) {
  const auth = useAuth();
  // until /auth/me answers, trust this device's last answer: a visitor gets the landing page at once (first paint), a member the
  // dashboard's placeholders
  const status = auth.status === 'loading' ? (wasSignedIn() ? 'loading' : 'out') : auth.status;
  return (
    <main>
      <div className="page grid gap-12 pt-6 lg:gap-14">
        {status === 'loading' && (
          <div aria-busy="true" className="grid gap-4 md:grid-cols-[1fr_1.3fr_1fr]">
            <span className="shimmer block h-[420px] rounded-[28px]" />
            <span className="shimmer block h-[420px] rounded-[28px]" />
            <span className="shimmer block h-[420px] rounded-[28px] max-md:hidden" />
          </div>
        )}
        {status === 'out' && <Landing boot={boot} />}
        {status === 'in' && <Dashboard boot={boot} />}
      </div>
    </main>
  );
}
