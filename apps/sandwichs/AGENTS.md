<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (sandwichs)

- Read `README.md` first. UI text is in **French**; code and comments in English.
- This app is NOT an npm workspace of the repo root, on purpose: Bruno's `GENERER.sh` runs
  `npm install` at the root and must not install Next.js. Run npm commands inside `apps/sandwichs`.
- `cacheComponents` is off on purpose; pages are `force-dynamic` and always read fresh data.
- All date/time rules use Europe/Paris (`src/lib/time.ts`); the server runs in UTC.
- Prices are integer cents. `src/lib/cart.ts` (`priceCart`, which also detects formules) is the single source of truth for
  pricing and runs on both client and server; the server re-validates every order.
- Admin Server Actions must call `requireAdmin()`; `src/proxy.ts` is only a first check.
- Before finishing a change: `npm test && npm run typecheck && npm run lint`, and for UI flows
  run `e2e/smoke.mjs` against `npm run dev`.
- Customers are not emailed or texted by the server. "Livrée" in /admin opens a wa.me link
  (`src/lib/whatsapp.ts`) so Bruno sends the WhatsApp message himself from his phone.
- The database schema lives in `drizzle/` migrations. Never edit a migration that has run in
  production; change `src/lib/db/schema.ts` and add a new one with `npm run db:generate`.

## Phones only

The customer site and the admin are only used on phones. Design for a phone screen; the e2e flow
and the demo videos run in a phone viewport (390×844).

## Show visual changes as a video

The user doesn't read the code. After **any** change that is visible in the UI (customer site,
admin, WhatsApp message), film the scene that shows it and show only that video in the chat:

1. Update `e2e/smoke.mjs` so the flow covers the change: adjust the scene where it happens, or
   add a `scene(...)` (its title and description are the video's French title card). Keep the
   test passing without `RECORD_DIR`, too.
2. Run `npm run demo -- <scene number or word from its title>` (e.g. `npm run demo -- 9` or
   `npm run demo -- qr`). It starts a dev server on port 3100 with a fresh, empty database,
   plays the whole flow (later scenes need earlier data) and films only the chosen scenes, each as
   `.data/demo/NN-scene-title.mp4`. The paths are printed with 🎬.
3. Embed only the relevant video(s) in your reply with the absolute path
   (`![Demo](/abs/path/.data/demo/09-....mp4)`) and say in a few words what it shows. Check a
   few frames yourself first (e.g.
   `ffmpeg -i video.mp4 -vf fps=1/2,scale=200:-1,tile=6x2 -frames:v 1 sheet.png`).

## Online payments (SumUp)

Customers pay online when they order (SumUp Hosted Checkout, `src/lib/sumup.ts`). Accounts, keys, local tests with real test payments, deploy and troubleshooting: see the runbook `docs/sumup.md`. Read it before touching payments.

- Locally without `SUMUP_API_KEY`, payments are simulated and always succeed (e2e and demo videos rely on this). Never leave a sandbox key in `.env.local` when running `npm run demo` or the e2e flow: "Payer" would go to SumUp's real page.
- Keys live in 1Password (vault Personal): "SumUp API - Suricate" (production) and "SumUp API - Suricate Sandbox" (tests). Never paste them in chat or commit them.
