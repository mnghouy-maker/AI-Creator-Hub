# Frontend & Dashboard (Phase 5)

The Next.js app is the production build of the approved Phase-1 prototype, now a
real, typed, componentized application wired to the Phase-4 API. It **typechecks,
lints, and builds** (11 routes, ~102 kB shared First Load JS), and was verified
running with screenshots in light and dark.

## What ships

| Area      | Routes / pieces                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing | `/` — nav, animated hero (live translation pipeline + canvas waveform), feature grid, language chips, pricing (monthly/yearly), footer |
| Auth      | `/login` (2FA-aware), `/register`, `/forgot-password`, `/reset-password`, `/verify-email` + Google/GitHub buttons                      |
| App shell | sidebar, sticky topbar (credit balance, user menu), ⌘K command palette, light/dark                                                     |
| Dashboard | `/dashboard` — credit meter, stat tiles, SVG usage chart, live job progress, recent-projects table, quick actions                      |
| Library   | `/projects` — search, type filters, favorite toggle                                                                                    |

## Design system

Tokens (`app/globals.css`) are ported verbatim from the approved prototype — cool
ink grounds, coral signal accent, teal "output" accent — exposed as CSS variables
and mapped into Tailwind (`tailwind.config.ts`). Components read semantic tokens
only, so **light/dark is controlled in one place** (next-themes toggles `.dark`).
Reduced-motion is respected; keyboard focus is always visible.

## Architecture choices

- **One API client** (`lib/api.ts`) is the only thing that talks to the backend.
  It always sends `credentials: 'include'` so the http-only session cookie rides
  along — the browser never sees the token (Architecture §4.6). Non-2xx throws a
  typed `ApiError` so callers branch on status (401 → login, 402 → upsell).
- **Business config comes from `@hub/shared`.** Pricing cards and language chips
  render straight from `PLANS` and `LANGUAGES`, so marketing can never drift from
  what billing charges.
- **Server shells, client islands.** Marketing sections render on the server;
  only interactive bits (hero animation, pricing toggle, dashboard) are client
  components — fast first paint, small JS.
- **Route protection is enforced by the API**, not the client. Every data call
  needs the session cookie; a client redirect is a UX nicety layered in Phase 9.

## The `.js` → `.ts` resolution note

`@hub/shared` uses NodeNext-style `.js` import specifiers (required so the API and
worker compile). `next.config.mjs` adds a webpack `extensionAlias` so those
specifiers resolve to the real `.ts` sources — one import style works across the
bundler and Node without a build step.

## Honest status

- Dashboard/library **numbers are sample data** (`lib/sample-data.ts`), clearly
  isolated. The shell, cards, and charts are real; they swap to live aggregate
  endpoints in Phase 6 (usage/credits) and Phase 8 (revenue).
- Tool pages (Video Translator, Voice, Script, Blog, Social) are marked "Soon" in
  the nav — they're Phase 6.
- Auth pages call the real Phase-4 endpoints; sign-in/up works against a running
  API.
