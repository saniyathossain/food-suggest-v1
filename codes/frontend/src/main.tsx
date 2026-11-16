import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { markDeviceStrain } from '@/lib/device';
import { loadLanguage } from '@/lib/i18n';
import { readPrefs } from '@/lib/prefs';
import { installReveal } from '@/lib/reveal';
import { watchForNewBuild } from '@/lib/stale';
import '@/index.css';

watchForNewBuild();

markDeviceStrain();
const root = document.getElementById('root');
// a Bangla reader's dictionary arrives before the first render (never an English flash); English needs no wait
const ready = loadLanguage(readPrefs().lang).catch(() => undefined);
if (root) void ready.then(() => render(root));

function render(root: HTMLElement): void {
  installReveal(root);
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
