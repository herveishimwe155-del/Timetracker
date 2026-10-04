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

## Design tokens

Monolith tokens live in `src/app/globals.css`. Use the Tailwind names: `bg-background`, `bg-surface`, `border-line`, `text-muted-foreground`, `text-brand` (emerald), `text-brand-2` (cyan), `text-danger`. shadcn's own `accent` is the subtle hover fill, not emerald. Use the `tabular` class (or `TimerDigits`) for every duration and number.
