import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { installChrome } from '@/lib/chrome';
import { markDeviceStrain } from '@/lib/device';
import { loadLanguage } from '@/lib/i18n';
import { readPrefs } from '@/lib/prefs';
import { installReveal } from '@/lib/reveal';
import { warmOtherLanguage } from '@/lib/warm';
import { watchForNewBuild } from '@/lib/stale';
import '@/index.css';

watchForNewBuild();

// the browser's own confirm / alert / prompt are blocked: the app asks with its own dialogs (lib/confirm.ts); a stray call is logged and answers "no"
for (const name of ['alert', 'confirm', 'prompt'] as const) {
  Object.defineProperty(window, name, {
    configurable: false,
    value: () => {
      console.error(`window.${name} is blocked: use confirmDialog() or notice() from lib/confirm`);
      return name === 'alert' ? undefined : name === 'prompt' ? null : false;
    },
  });
}

markDeviceStrain();
installChrome();
const root = document.getElementById('root');
// a Bangla reader's dictionary arrives before the first render (never an English flash); English needs no wait
const ready = loadLanguage(readPrefs().lang).catch(() => undefined);
if (root) void ready.then(() => render(root));

function render(root: HTMLElement): void {
  installReveal(root);
  warmOtherLanguage();
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
