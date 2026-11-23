// The shell: the floating top bar, the outage screen, toasts, Spotlight (⌘K / Ctrl+K / "/"), and the page for the path. Only Today
// ships in the first bundle; every other page loads on demand, and all of them are fetched once the browser is idle, so a later
// outage never strands navigation. While a page's code or first data is on the way, a skeleton shaped like that page holds its place.
import { lazy, Suspense, useEffect, useState } from 'react';
import { loadIconNames } from '@/components/icons';
import { ErrorBox } from '@/components/kit/loaderror';
import { RouteBones } from '@/components/kit/routebones';
import { MenuBar } from '@/components/MenuBar';
import { TabBar } from '@/components/TabBar';
import { OutageScreen } from '@/components/Outage';
import { endpoints, useResource } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { match, navigate, usePath } from '@/lib/router';
import type { Bootstrap } from '@/lib/types';
import Home from '@/pages/Home';
import { MealIsland } from '@/components/island/MealIsland';
import { StatusIsland } from '@/components/island/StatusIsland';

const Condition = lazy(() => import('@/pages/Condition'));
const Plan = lazy(() => import('@/pages/Plan'));
const Foods = lazy(() => import('@/pages/Foods'));
const Planner = lazy(() => import('@/pages/Planner'));
const Medicines = lazy(() => import('@/pages/Medicines'));
const Medicine = lazy(() => import('@/pages/Medicine'));
const Admin = lazy(() => import('@/pages/Admin'));
const Bmi = lazy(() => import('@/pages/Bmi'));
const Food = lazy(() => import('@/pages/Food'));
const Recipes = lazy(() => import('@/pages/Recipes'));
const Auth = lazy(() => import('@/pages/Auth'));
const Account = lazy(() => import('@/pages/Account'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Recipe = lazy(() => import('@/pages/Recipe'));
const Read = lazy(() => import('@/pages/Read'));
const Article = lazy(() => import('@/pages/Article'));
const ConfirmHost = lazy(() => import('@/components/kit/confirmhost').then((module) => ({ default: module.ConfirmHost })));
const ToastLayer = lazy(() => import('@/components/kit/toast').then((module) => ({ default: module.ToastLayer })));
const Spotlight = lazy(() => import('@/components/Spotlight').then((module) => ({ default: module.Spotlight })));

const chunks = [
  () => import('@/components/OutageCard'),
  () => import('@/pages/home/Builder'),
  () => import('@/pages/home/More'),
  () => import('@/components/MenuSheet'),
  () => import('@/lib/switching'),
  () => import('@/pages/Condition'),
  () => import('@/pages/Plan'),
  () => import('@/pages/Medicines'),
  () => import('@/pages/Planner'),
  () => import('@/pages/Foods'),
  () => import('@/pages/Food'),
  () => import('@/pages/Bmi'),
  () => import('@/pages/Recipes'),
  () => import('@/pages/Auth'),
  () => import('@/pages/Account'),
  () => import('@/pages/Pricing'),
  () => import('@/pages/Recipe'),
  () => import('@/pages/Read'),
  () => import('@/pages/Article'),
  () => import('@/components/Spotlight'),
  () => import('@/components/ConditionsMenu'),
  loadIconNames,
];

/** Fetch every page's code once the first page is up, and start the smooth scroll. */
function whenIdle(): void {
  const run = () => {
    chunks.forEach((load) => void load().catch(() => undefined));
    void import('@/lib/smooth').then((module) => module.installSmoothScroll());
  };
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 1500);
}

/** Pages behind sign-in: signed out goes to /login and comes back after. */
function Signed({ next, children }: { next: string; children: React.ReactNode }) {
  const auth = useAuth();
  useEffect(() => {
    if (auth.status === 'out') navigate(`/login?next=${encodeURIComponent(next)}`);
  }, [auth.status, next]);
  return auth.status === 'in' ? <>{children}</> : <RouteBones home={false} />;
}

function Screen({ boot, path }: { boot: Bootstrap; path: string }) {
  const condition = match('/condition/:slug', path);
  if (condition?.slug) return <Condition key={condition.slug} slug={condition.slug} />;
  const food = match('/food/:slug', path);
  if (food?.slug) return <Food key={food.slug} slug={food.slug} />;
  const recipe = match('/recipe/:slug', path);
  if (recipe?.slug) return <Recipe key={recipe.slug} slug={recipe.slug} />;
  const article = match('/read/:slug', path);
  if (article?.slug) return <Article key={article.slug} slug={article.slug} />;
  const medicine = match('/medicines/:slug', path);
  if (medicine?.slug) return <Medicine key={medicine.slug} slug={medicine.slug} />;
  if (path === '/medicines') return <Medicines />;
  if (path === '/recipes') return <Recipes />;
  if (path === '/login') return <Auth mode="login" />;
  if (path === '/register') return <Auth mode="register" />;
  if (path === '/forgot') return <Auth mode="forgot" />;
  if (path === '/reset') return <Auth mode="reset" />;
  if (path === '/pricing') return <Pricing />;
  if (path === '/account' || path === '/welcome') return <Signed next={path}><Account boot={boot} welcome={path === '/welcome'} /></Signed>;
  if (path === '/read') return <Read />;
  if (path === '/tools/bmi') return <Bmi />;
  if (path === '/plan') return <Plan boot={boot} />;
  if (path === '/planner') return <Signed next={path}><Planner /></Signed>;
  if (path === '/foods') return <Foods boot={boot} />;
  if (path === '/admin' || path.startsWith('/admin/')) return <Admin />;
  return <Home boot={boot} />;
}

function useSpotlightKeys(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((now) => !now);
        return;
      }
      if (event.key !== '/' || typing) return;
      event.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('spotlight:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('spotlight:open', onOpen);
    };
  }, []);
  return [open, setOpen];
}

export default function App() {
  const { lang } = useI18n();
  const path = usePath();
  const { data: boot, error } = useResource<Bootstrap>(endpoints.bootstrap(lang));
  const [spotlight, setSpotlight] = useSpotlightKeys();
  useEffect(whenIdle, []);
  const bones = <RouteBones home={path === '/'} />;
  return (
    <StatusIsland>
      <MenuBar boot={boot} />
      <TabBar />
      <OutageScreen />
      <Suspense fallback={null}>
        <ConfirmHost />
        <ToastLayer />
      </Suspense>
      {spotlight && (
        <Suspense fallback={null}>
          <Spotlight boot={boot} onClose={() => setSpotlight(false)} />
        </Suspense>
      )}
      {error && !boot && (
        <main className="page">
          <ErrorBox />
        </main>
      )}
      {!boot && !error && bones}
      {boot && (
        <Suspense fallback={bones}>
          <Screen boot={boot} path={path} />
        </Suspense>
      )}
      {boot && <MealIsland boot={boot} />}
    </StatusIsland>
  );
}
