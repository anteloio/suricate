# Runbook: online payments with SumUp

## How it works

- The order is saved with status `a_payer`, then the server creates a SumUp checkout (`src/lib/sumup.ts`, Hosted Checkout).
- The customer pays on SumUp's page (card, Apple Pay, Google Pay). The page stays valid 30 min.
- SumUp's "Back to merchant website" button leads to `/commande/<code>?nouvelle=1`.
- The order page and the webhook `/api/sumup/webhook` ask SumUp for the checkout status. `PAID` → the order becomes `confirmee` (`paidAt` set).
- Bruno's admin only shows paid orders. An unpaid order stays `a_payer` and is never shown to him; the customer can pay it later from the order page ("Payer").
- Refunds are not automatic: when Bruno cancels a paid order, he refunds it in the SumUp dashboard (Ventes).
- The webhook body is not trusted: the status is always read from the SumUp API.
- SumUp docs: https://developer.sumup.com/online-payments/

## Accounts and keys

- Production merchant: **SURICATE**, merchant code `M5TTP964` (Bruno's account).
- Sandbox merchant (test mode, no real money): **Suricate Sandbox**, merchant code `MG86DHYM`.
- API keys (1Password, vault Personal):
  - "SumUp API - Suricate": production key, named « web app » in SumUp.
  - "SumUp API - Suricate Sandbox": sandbox key, named « tests locaux » in SumUp.
- Keys are managed in me.sumup.com → Paramètres → Développeurs → Clés API. A key is shown only once at creation.
- Access: team roles Caissier, Comptable and Manager can't open the developer pages. Flavio has a custom role « full access » (all permissions), which can.
- Switch between SURICATE and the sandbox with the merchant menu at the top left of the dashboard.

## Vercel (production)

- Project `suricate` (team `mdless`), production variables `SUMUP_API_KEY` (sensitive) and `SUMUP_MERCHANT_CODE`.
- In production the app refuses to run payments without these two variables.
- The webhook URL is sent with each checkout (`https://<site>/api/sumup/webhook`); nothing to configure in SumUp.

## Test locally with real test payments

1. In `apps/sandwichs`, write `.env.local` from 1Password:
   ```bash
   { printf 'SUMUP_API_KEY=%s\n' "$(op read 'op://Personal/SumUp API - Suricate Sandbox/credential')"; echo 'SUMUP_MERCHANT_CODE=MG86DHYM'; } > .env.local
   ```
2. `npm run dev`, place an order, click « Payer ». SumUp's page shows « Test mode ».
3. Test card (published by SumUp): `4200 0000 0000 0091`, expiry `12/30`, CVV `123`, any name. More cards (3DS challenge, failures): https://developer.sumup.com/online-payments/testing
4. An amount of exactly 11,00 € always fails in the sandbox.
5. Locally there is no webhook (SumUp can't reach localhost): the order page checks the status when it loads.
6. Delete `.env.local` afterwards, before `npm run demo` or the e2e flow.

## Rotate a key

1. Create a new key in SumUp (Clés API), copy it into 1Password (same item).
2. Update Vercel: `vercel env rm SUMUP_API_KEY production`, then `vercel env add SUMUP_API_KEY production --sensitive` (paste from 1Password), then redeploy.
3. Revoke the old key in SumUp.

## Troubleshooting

- "Le paiement en ligne est indisponible": the checkout creation failed. See the Vercel function logs (`SumUp checkout failed`). A 403 `checkout_payments_not_allowed` means online payments are not enabled on the merchant: ask SumUp support.
- Paid but the order still shows "Paiement en attente": open the order page (it re-checks SumUp), or check the checkout in SumUp's dashboard. The webhook retries for about 2 h.
- Check a key from the terminal: `curl -H "Authorization: Bearer $(op read 'op://Personal/SumUp API - Suricate/credential')" https://api.sumup.com/v0.1/me`.
