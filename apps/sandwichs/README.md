# Suricate · Sandwichs

Online sandwich pre-orders for Bruno, delivered at lunch in Sophia Antipolis.
Customers order before the cutoff (10h by default) for the days Bruno opens; they pay on delivery.

- **Customer site** `/`: formule builder (sandwich* + drink), à-la-carte items, cart, delivery
  address with autocomplete (French government address API) restricted to a radius around
  Sophia Antipolis, payment method chosen at order time. Confirmation page `/commande/<code>`.
- **Bruno's area** `/admin` (password): orders per day with production totals and payment
  breakdown, "livrée" button (emails the customer that the order has arrived), days to open, menu editor, settings
  (cutoff, delivery window, formule price, minimum order, zone radius).

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · Postgres
(Neon in production, embedded PGlite locally) · Resend for emails. Hosted on Vercel.

## Local development

```bash
cd apps/sandwichs
npm install
npm run dev          # http://localhost:3000, admin password: admin
```

No setup needed: the database lives in `.data/` (delete the folder to start over), and emails
are printed in the terminal. See `.env.example` for optional variables.

```bash
npm test             # unit tests (pricing, cutoff/timezone, zone)
npm run typecheck
npm run lint
BASE_URL=http://localhost:3000 node e2e/smoke.mjs   # full flow in local Chrome
npm run demo                                     # same flow recorded as .data/demo/demo.mp4
```

## Database changes

Edit `src/lib/db/schema.ts`, then `npm run db:generate` to create a SQL migration in `drizzle/`.
Migrations run automatically before `next dev` and `next build` (so on every Vercel deploy).
On an empty database the initial menu (`src/lib/db/seed.ts`) and default settings are inserted.

## Deployment (Vercel)

Live at **https://suricate-sandwichs.vercel.app** (Vercel team `mdless`, project
`suricate-sandwichs`, functions in `fra1`).

- Project root directory: `apps/sandwichs`. `vercel.json` skips builds when a commit doesn't
  touch this folder (e.g. Bruno's food truck menu updates).
- Database: Neon project `suricate-sandwichs` (`aws-eu-central-1`, Frankfurt), pooled
  connection string in the `DATABASE_URL` production variable. Migrations run at build time.
- Environment variables (production): `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`; for
  emails `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`; optionally `SITE_URL`.
- Deploy by hand from the repo root (already linked in `.vercel/`): `vercel deploy --prod`.
  Once the Vercel GitHub app has access to the repo, `vercel git connect` makes every push
  to `main` deploy automatically.
