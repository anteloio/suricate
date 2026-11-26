# Suricate · Sandwichs

Online sandwich pre-orders for Bruno, delivered at lunch to fixed delivery points.
Customers order before the cutoff (10h by default) for the days Bruno opens and pay online (SumUp)
when they order.

- **Customer site** `/`: menu with a +/− counter on every item (Uber Eats style); the formule
  (sandwich* + drink at the formule price) is applied automatically, as many times as it saves
  money, by `priceCart` in `src/lib/cart.ts` (same greedy rule as the food truck's
  `apps/foodtruck/src/models/order.js`, recomputed by the server on every order). Then first name,
  phone, a delivery point picked from a list, then payment. Confirmation page `/commande/<code>`.
- **Order numbers** (`src/lib/order-number.ts`): delivery day + sequence of that day,
  `20261127-001`, given when the order is paid (no gaps in Bruno's list). URLs and "Mes commandes"
  keep the random 5-character `code`, so nobody can browse other people's orders.
- **Online payment (SumUp Hosted Checkout)**, in `src/lib/sumup.ts`: the order is saved as
  `a_payer`, the customer pays on SumUp's page (card, Apple Pay, Google Pay) and comes back to
  `/commande/<code>`. That page and the webhook `/api/sumup/webhook` ask SumUp for the checkout
  status; once `PAID` the order becomes `confirmee`. Bruno's admin never shows unpaid orders. A
  cancelled order is not refunded automatically: Bruno refunds it in SumUp. Without
  `SUMUP_API_KEY` (local, e2e, demo) payments are simulated and always succeed. Runbook: `docs/sumup.md`.
- **Mes commandes** `/mes-commandes`: the codes of the orders placed on a phone are kept in its
  localStorage (`src/lib/order-history.ts`); the page asks `POST /api/commandes/historique` for
  the current state of those codes only (no accounts, no listing of other orders).
- **Delivery points** live in `src/lib/delivery-points.ts` (name, address, coordinates). Add an
  entry there to offer a new point; keep existing ids, they are stored on orders.
- **Bruno's area** `/admin` (password): orders per day with production totals and payment
  breakdown, "Livrée" button (marks the order delivered, then opens WhatsApp on Bruno's phone
  with a ready-to-send message to the customer, via a wa.me link; see `src/lib/whatsapp.ts`), days to open, menu editor, settings (cutoff, delivery window, formule price).
- **QR code**: `/qr` is the bare PNG pointing to the production site (`src/lib/site-url.ts`);
  `/qr/affiche` is a portrait poster (logo, QR, cutoff, address). The admin page `/admin/qr`
  shows the poster with a "Partager" button that opens the phone's share sheet; the button is
  hidden where the browser can't share files (a computer).
- **Admin app**: `/admin` is installable on Bruno's phone (manifest and icons in
  `public/admin-app/`, no-cache service worker `public/admin-sw.js`). A banner in the admin
  offers the install when the browser allows it (Android/Chrome) or explains it (iPhone Safari).

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
npm run demo -- 9                                # film scene 9 as .data/demo/09-….mp4 (no args: all)
```

## Database changes

Edit `src/lib/db/schema.ts`, then `npm run db:generate` to create a SQL migration in `drizzle/`.
Migrations run automatically before `next dev` and `next build` (so on every Vercel deploy).
On an empty database the initial menu (`src/lib/db/seed.ts`) and default settings are inserted.

## Deployment (Vercel)

Live at **https://suricate.vercel.app** (Vercel team `mdless`, project `suricate`, functions in
`fra1`).

- Project root directory: `apps/sandwichs`. `vercel.json` skips builds when a commit doesn't
  touch this folder (e.g. Bruno's food truck menu updates).
- Database: Neon project `suricate-sandwichs` (`aws-eu-central-1`, Frankfurt), pooled
  connection string in the `DATABASE_URL` production variable. Migrations run at build time.
- Environment variables (production): `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
  `SUMUP_API_KEY` (key « web app » of the SURICATE merchant; 1Password: "SumUp API - Suricate"),
  `SUMUP_MERCHANT_CODE` (`M5TTP964`).
  (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SITE_URL` are no longer used.)
- Deploy by hand from the repo root (already linked in `.vercel/`): `vercel deploy --prod`.
  Once the Vercel GitHub app has access to the repo, `vercel git connect` makes every push
  to `main` deploy automatically.
