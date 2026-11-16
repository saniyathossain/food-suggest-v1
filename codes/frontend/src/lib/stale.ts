// After a deploy, a tab opened before it still asks for the old build's lazy chunks, which no longer exist. Instead of an error,
// reload once onto the new build (a session flag stops a reload loop if something else is really wrong).
const FLAG = 'pathya.reloaded';
export const STALE_CHUNK = /dynamically imported module|Importing a module script failed|Unable to preload CSS|Failed to load module script|error loading dynamically/i;

export function reloadForNewBuild(): boolean {
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

/** Vite reports a chunk it could not load; and a page that loaded fine clears the flag for the next deploy. */
export function watchForNewBuild(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      // nothing to clear
    }
  }, 10_000);
}
