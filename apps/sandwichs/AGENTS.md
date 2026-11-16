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

## Show visual changes as a video

The user doesn't read the code. After **any** change that is visible in the UI (customer site,
admin, WhatsApp message), record the demo and show it in the chat:

1. Update `e2e/smoke.mjs` so the flow covers the change (each `scene(...)` becomes a chapter
   with a French title card; keep the test passing without `RECORD_DIR`, too).
2. Run `npm run demo`. It starts a dev server on port 3100 with a fresh, empty database, plays
   the flow slowly with a visible cursor, and writes `.data/demo/demo.mp4`.
3. Embed the video in your reply with its absolute path (`![Demo](/abs/path/.data/demo/demo.mp4)`)
   and say in a few words what it shows. Check a few frames yourself first (e.g.
   `ffmpeg -i demo.mp4 -vf fps=1/4,scale=400:-1,tile=5x4 -frames:v 1 sheet.png`).
