<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (sandwichs)

- Read `README.md` first. UI text and emails are in **French**; code and comments in English.
- This app is NOT an npm workspace of the repo root, on purpose: Bruno's `GENERER.sh` runs
  `npm install` at the root and must not install Next.js. Run npm commands inside `apps/sandwichs`.
- `cacheComponents` is off on purpose; pages are `force-dynamic` and always read fresh data.
- All date/time rules use Europe/Paris (`src/lib/time.ts`); the server runs in UTC.
- Prices are integer cents. `src/lib/cart.ts` (`priceCart`) is the single source of truth for
  pricing and runs on both client and server; the server re-validates every order.
- Admin Server Actions must call `requireAdmin()`; `src/proxy.ts` is only a first check.
- Before finishing a change: `npm test && npm run typecheck && npm run lint`, and for UI flows
  run `e2e/smoke.mjs` against `npm run dev`.
