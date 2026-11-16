# Suricate · Sandwichs

Online sandwich pre-orders for Bruno, delivered at lunch to fixed delivery points.
Customers order before the cutoff (10h by default) for the days Bruno opens; they pay on delivery.

- **Customer site** `/`: menu with a +/− counter on every item (Uber Eats style); the formule
  (sandwich* + drink at the formule price) is applied automatically, as many times as it saves
  money, by `priceCart` in `src/lib/cart.ts` (same greedy rule as the food truck's
  `apps/foodtruck/src/models/order.js`, recomputed by the server on every order). Then first name,
  phone, a delivery point picked from a list, payment method chosen at order time. Confirmation
  page `/commande/<code>`.
- **Mes commandes** `/mes-commandes`: the codes of the orders placed on a phone are kept in its
  localStorage (`src/lib/order-history.ts`); the page asks `POST /api/commandes/historique` for
  the current state of those codes only (no accounts, no listing of other orders).
- **Delivery points** live in `src/lib/delivery-points.ts` (name, address, coordinates). Add an
  entry there to offer a new point; keep existing ids, they are stored on orders.
- **Bruno's area** `/admin` (password): orders per day with production totals and payment
  breakdown, "Livrée" button (marks the order delivered, then opens WhatsApp on Bruno's phone
  with a ready-to-send message to the customer, via a wa.me link; see `src/lib/whatsapp.ts`), days to open, menu editor, settings (cutoff, delivery window, formule price, minimum order).

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · Postgres
(Neon in production, embedded PGlite locally). Hosted on Vercel.

## Local development

```bash
cd apps/sandwichs
npm install
npm run dev          # http://localhost:3000, admin password: admin
```

No setup needed: the database lives in `.data/` (delete the folder to start over). See
`.env.example` for optional variables.

```bash
npm test             # unit tests (pricing, cutoff/timezone, delivery points, WhatsApp link)
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
- Environment variables (production): `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
  (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SITE_URL` are no longer used.)
- Deploy by hand from the repo root (already linked in `.vercel/`): `vercel deploy --prod`.
  Once the Vercel GitHub app has access to the repo, `vercel git connect` makes every push
  to `main` deploy automatically.
