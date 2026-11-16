// Pathya's addition to the vendored islandcn engine. islandcn renders its CSS as React 19 `<style>` elements, which this app's
// Content-Security-Policy (`style-src 'self'`, no inline style elements) refuses. A constructable stylesheet added to
// `document.adoptedStyleSheets` is CSSOM, which `style-src` does not govern, so the same CSS applies with the policy unchanged.
import { useInsertionEffect } from 'react';

const adopted = new Set<string>();

/** Add `css` to the document once per `id` (later calls with the same id do nothing). */
export function adoptCss(id: string, css: string): void {
  if (typeof document === 'undefined' || adopted.has(id)) return;
  adopted.add(id);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}

/** `adoptCss` from a component, before the first paint that needs it. */
export function useAdoptedCss(id: string, css: string): void {
  useInsertionEffect(() => adoptCss(id, css), [id, css]);
}
