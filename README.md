# Time Tracker

Web-first time tracker in the Monolith style. Next.js (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui (Radix), Supabase, deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests (`tests/unit`) |
| `npm run test:e2e` | Playwright end-to-end and accessibility tests (`tests/e2e`), desktop and 360 px phone |
| `npm run test:rls` | Row-level security tests against a local Supabase (needs Docker) |

## Design tokens

Monolith tokens live in `src/app/globals.css`. Use the Tailwind names: `bg-background`, `bg-surface`, `border-line`, `text-muted-foreground`, `text-brand` (emerald), `text-brand-2` (cyan), `text-danger`. shadcn's own `accent` is the subtle hover fill, not emerald. Use the `tabular` class (or `TimerDigits`) for every duration and number.

## End-to-end tests

```bash
npx playwright install chromium   # once
npm run test:e2e
```

Signed-out tests always run. The signed-in tests (timer, entries, reports, CSV, accessibility of every page) need a **dedicated test account** in the Supabase project; they create entries starting with "e2e" and delete them afterwards:

```bash
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

Set `E2E_BASE_URL` to test an already running app (for example a Vercel preview) instead of starting a dev server.

## Monitoring and analytics

Both are off until their keys are set (locally in `.env.local`, and in Vercel):

- **Sentry** (`NEXT_PUBLIC_SENTRY_DSN`): errors from the browser, server and proxy. Cookies, headers, request bodies and query strings are never sent; errors carry the account id only.
- **PostHog** (`NEXT_PUBLIC_POSTHOG_KEY`, EU host by default): product events listed in `src/lib/analytics.ts`. No cookies or local storage, no autocapture, no session recordings; users are identified by account id, never email.
