import { z } from 'zod'
import { MAX_HISTORY, ORDER_CODE_RE } from '@/lib/order-history'
import { getOrdersByCodes } from '@/lib/queries'

const bodySchema = z.object({ codes: z.array(z.string().regex(ORDER_CODE_RE)).max(MAX_HISTORY) })

/** Current state of the orders whose codes are stored on the customer's device. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Requête invalide.' }, { status: 400 })
  try {
    const orders = await getOrdersByCodes([...new Set(parsed.data.codes)])
    return Response.json({ ok: true, orders }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('order history failed', err)
    return Response.json({ ok: false, error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
