// The live-status island (islandcn, lib/island): one per app, mounted around everything in App.tsx so any page can start an
// activity. It sits in a fixed slot just under the floating menu bar (the bar keeps the top centre for its links), and it is
// only there while something runs: the resting capsule would be a black shape with nothing to say, so the slot hides once
// the island has gone back to idle (after its dismiss motion). Activities: components/island/*.
import type { ReactNode } from 'react';
import { Island, IslandProvider, useIsland } from '@/lib/island';
import { usePrefs } from '@/lib/prefs';

// the page colour behind it in dark mode (tokens.css --background), so the engine draws the keyline at the right strength
const DARK_PAGE = '#0f0d16';

function Slot() {
  const { presentation } = useIsland();
  const { theme } = usePrefs();
  return (
    <div className="island-slot" data-idle={presentation === 'idle' || undefined} aria-hidden={presentation === 'idle' || undefined}>
      {theme === 'dark' ? <Island backdrop={DARK_PAGE} /> : <Island />}
    </div>
  );
}

export function StatusIsland({ children }: { children: ReactNode }) {
  return (
    <IslandProvider>
      <Slot />
      {children}
    </IslandProvider>
  );
}
