# AGENTS.md

## Context

- **Bruno** owns the food truck **Suricate** and is the person who uses these apps.
- The UI and all customer/staff-facing text are in **French**.

## Layout (npm workspaces monorepo)

```
apps/foodtruck/   Food truck point-of-sale (Vite + React, deployed to GitHub Pages)
src/config.js     The food truck menu, edited by Bruno by hand (kept here on purpose, see below)
GENERER.sh        Bruno's one-click deploy script (runs from the repo root)
package.json      Workspace root: proxies dev/build/deploy to apps/foodtruck
```

- **apps/foodtruck** — orders are taken on an Android tablet and tickets are printed on a
  Bluetooth thermal printer through the RawBT app. The menu (burgers, formules, ingredients,
  prices) lives in the root `src/config.js`; `apps/foodtruck/src/config.js` only re-exports it. The build is a single inlined `index.html`
  in `apps/foodtruck/dist/`, which is committed on purpose.
- New apps go in `apps/<name>/` with their own `package.json`. Install dependencies from the
  repo root (`npm install`); there is a single `package-lock.json` at the root.

## Don't break Bruno's deploy

Bruno deploys from their own Mac with `GENERER.sh` (see README → Deployment). It must stay a
one-click, no-questions-asked deploy. It runs, from the repo root:
`git pull && npm install && npm run deploy && git add . && git commit && git push`.

- **Never move or rename `src/config.js`.** Bruno edits it by hand and then runs `GENERER.sh`, whose
  first step is `git pull`. If upstream moved the file, that pull aborts on Bruno's uncommitted
  edit and the deploy fails. Bruno also finds the file by that path.
- The root `package.json` must keep a `deploy` script that builds and publishes the food truck.
- Avoid editing `GENERER.sh`. `git pull` rewrites the file while bash is still executing it, so a
  change only takes effect on the *next* run, and changing its length can make the running copy
  execute garbage. If it must change, keep every command working with both the old and new
  repo layout for one deploy cycle.
- Don't add anything to the repo that `git add .` would commit by accident (build caches, `.env`).
