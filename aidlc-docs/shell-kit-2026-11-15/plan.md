# U1.5 — Rebuild the web app on Shell Console's frontend kit

**Owner decisions (2026-11-15):** follow Shell Console thoroughly for packages, components, animation and motion —
adopt **Tailwind 4** (same engine, token files, utilities) and **Hugeicons + Iconly** (same icon system and idle-loaded
hover animations). Look stays Pathya's own ("not 100% Shell Console, improvise"): light Lifesum-style ground, fresh green
accent, macOS typography (SF Pro / Inter, Kohinoor/Noto Bangla), food photography, glass only on the top bar and menus,
no bottom dock.

## Package parity (exact versions from shellconsole/codes/frontend/package.json)
Adopt: tailwindcss + @tailwindcss/vite 4.3.5 · @hugeicons/react 1.1.10 · @hugeicons/core-free-icons 4.4.0 ·
@animateicons/react 0.13.0 · motion 14.14.0 · lenis 1.3.27 · recharts 3.10.1 · class-variance-authority 0.7.1 ·
clsx 2.1.1 · tailwind-merge 3.7.0 · @radix-ui/react-{checkbox 1.4.1, dialog 1.3.1, dropdown-menu 2.2.1, label 2.1.17,
popover 1.3.1, slot 1.5.0, switch 1.4.1, tooltip 1.4.1} · get-nonce 1.0.1 · react-day-picker 10.0.2 (when dates land).
Skip (terminal-specific): @xterm/*, @codemirror/*, @lezer/*, @fontsource/* mono faces, voice-ring.

## Port (Shell Console path → Pathya path)
- `src/styles/{tokens,base,utilities,motion}.css` → `src/styles/` re-paletted; `index.css` imports like Shell Console.
- `components/ui/*` (button, action-button, badge, card, checkbox, dialog, dropdown-menu, icon-button, input, label,
  popover, switch, tooltip, swap) → `src/components/ui/`.
- `components/motion/*` (features/LazyMotion, presence, swapslot, textreveal, collapsible, expandable, island, tokens).
- `components/icons/*` (Hugeicons wrapper, animated, Iconly generated set) → `src/components/icons/`.
- `components/kit/*` generic parts: bones, loading, routeskeleton, loaderror, sectionboundary, countdown, counter,
  elapsed, progressring, statusrow, statestrip, chips, cards, stats, dropzone, paging, sorting, viewtoggle, querybar
  (+ lib/kql), table (+ lib/table), facetchips, feedback, forms, navigation, pageshell, beam, thinkingorb, downnotice.
- `components/charts/*` generic: ChartCard, Donut, Gauge, Rings, Bars, StackedBars, TimeChart, HeatCalendar, DotMeter.
- `lib/{outage,scrolling,rate,fancy}` patterns (outage already ported).
- Shell Console's i18n `t(key, …args)` maps onto Pathya's typed dictionaries through a small adapter.

## Rebuild
Every page (Home, Condition, Plan, Foods, Food, BMI, Admin, Spotlight, Outage, MenuBar) re-composed from the kit with
Tailwind utilities; `src/styles/app.css` one-off classes removed as each page moves. Behaviour kept: lazy chunks + idle
preload, outage flow, error boundary, CSP (`script-src 'self'`, no inline `<style>`), generated types, EN/BN, light/dark.

## Definition of done
`tsc` strict clean · `vite build` with entry ≤ 90 KB gzip · no console errors · screenshots at 375 / 768 / 1280 / 1440 in
light and dark · Lighthouse mobile + desktop ≥ 95 performance, 100 accessibility / best practices / SEO (U1.6 PageSpeed).
