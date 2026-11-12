# AGENTS.md

## Context

- **Bruno** owns the food truck **Suricate** and is the person who uses this app.
  It is the food truck's point-of-sale: orders are taken on an Android tablet and tickets are printed
  on a Bluetooth thermal printer through the RawBT app.
- The UI and all customer/staff-facing text are in **French**.
- Bruno deploys from their own Mac with `GENERER.sh` (see README → Deployment). Keep that script
  working: it must stay a one-click, no-questions-asked deploy.
- The menu (burgers, formules, ingredients, prices) lives in `src/config.js`.
