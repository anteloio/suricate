import { eq } from 'drizzle-orm'
import { db, orders } from '@/lib/db'
import { syncPayment } from '@/lib/orders'

/**
 * SumUp calls this when a checkout's status changes: { event_type, id }. The body is not trusted:
 * syncPayment reads the status from SumUp's API itself. Any 2xx stops SumUp's retries.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null
  if (typeof body?.id !== 'string') return new Response(null, { status: 204 })
  try {
    const d = await db()
    const [order] = await d.select().from(orders).where(eq(orders.sumupCheckoutId, body.id))
    if (order) await syncPayment(order)
    return new Response(null, { status: 204 })
  } catch (err) {
    console.error('SumUp webhook failed', err)
    return new Response(null, { status: 500 })
  }
}
