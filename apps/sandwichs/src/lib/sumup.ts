import 'server-only'

// Online payments through SumUp's Hosted Checkout: the server creates a checkout, the customer
// pays on SumUp's page (card, Apple Pay, Google Pay), and the server reads the checkout status back.
// Docs: https://developer.sumup.com/online-payments/checkouts/hosted-checkout
//
// Without SUMUP_API_KEY (local development, e2e, demo videos) payments are simulated: the
// "payment page" is the order page itself and every checkout reads as paid.

const API = 'https://api.sumup.com/v0.1'
const FAKE_PREFIX = 'test-'

export type CheckoutStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'

function credentials() {
  const apiKey = process.env.SUMUP_API_KEY
  const merchantCode = process.env.SUMUP_MERCHANT_CODE
  if (apiKey && merchantCode) return { apiKey, merchantCode }
  if (process.env.NODE_ENV === 'production') throw new Error('SUMUP_API_KEY and SUMUP_MERCHANT_CODE must be set')
  return null
}

export async function createCheckout(input: {
  reference: string
  amountCents: number
  description: string
  /** Where SumUp's "back to the site" button leads once paid. */
  redirectUrl: string
  /** Webhook SumUp calls when the status changes (must be public: omitted locally). */
  webhookUrl?: string
}): Promise<{ id: string; url: string }> {
  const creds = credentials()
  if (!creds) return { id: FAKE_PREFIX + input.reference, url: input.redirectUrl }

  const res = await fetch(`${API}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkout_reference: input.reference,
      amount: input.amountCents / 100,
      currency: 'EUR',
      merchant_code: creds.merchantCode,
      description: input.description,
      redirect_url: input.redirectUrl,
      ...(input.webhookUrl ? { return_url: input.webhookUrl } : {}),
      hosted_checkout: { enabled: true },
    }),
  })
  const body = (await res.json().catch(() => null)) as { id?: string; hosted_checkout_url?: string } | null
  if (!res.ok || !body?.id || !body.hosted_checkout_url) {
    throw new Error(`SumUp checkout failed (${res.status}): ${JSON.stringify(body)}`)
  }
  return { id: body.id, url: body.hosted_checkout_url }
}

export async function getCheckoutStatus(id: string): Promise<CheckoutStatus> {
  if (id.startsWith(FAKE_PREFIX)) return 'PAID'
  const creds = credentials()
  if (!creds) return 'PENDING'
  const res = await fetch(`${API}/checkouts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${creds.apiKey}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`SumUp checkout ${id}: ${res.status}`)
  const body = (await res.json()) as { status: CheckoutStatus }
  return body.status
}
