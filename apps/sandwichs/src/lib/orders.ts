import 'server-only'
import { randomInt } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

z.config(z.locales.fr())
import { cartItemSchema, priceCart } from './cart'
import { db, orderLines, orders, PAYMENT_METHODS, type OrderStatus } from './db'
import { findDeliveryPoint } from './delivery-points'
import { getMenu, getOrderableDays, getSettings } from './queries'

export const orderInputSchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(cartItemSchema).min(1).max(30),
  customerName: z.string().trim().min(2, 'Indiquez votre prénom.').max(80),
  phone: z
    .string()
    .trim()
    .refine(
      (p) => /^\+?[\d\s.-]{10,20}$/.test(p) && p.replace(/\D/g, '').length >= 10,
      'Numéro de téléphone invalide.'
    ),
  deliveryPointId: z.string({ error: 'Choisissez un point de livraison.' }).min(1, 'Choisissez un point de livraison.'),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().trim().max(500).default(''),
  website: z.string().max(0).optional(), // honeypot: bots fill it, humans never see it
})
export type OrderInput = z.input<typeof orderInputSchema>

export type CreateOrderResult = { ok: true; code: string } | { ok: false; error: string }

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function newCode() {
  return Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
}

export async function createOrder(raw: unknown): Promise<CreateOrderResult> {
  const parsed = orderInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }
  }
  const input = parsed.data
  const [s, menu] = await Promise.all([getSettings(), getMenu()])

  const days = await getOrderableDays(s.cutoffMinutes)
  if (!days.includes(input.serviceDate)) {
    return {
      ok: false,
      error: 'Les commandes sont fermées pour ce jour. Rechargez la page pour voir les jours disponibles.',
    }
  }
  const point = findDeliveryPoint(input.deliveryPointId)
  if (!point) {
    return { ok: false, error: 'Ce point de livraison n’existe plus. Rechargez la page et choisissez-en un autre.' }
  }
  const priced = priceCart(input.items, menu, s)
  if (!priced.ok) return { ok: false, error: priced.error }

  const d = await db()
  const code = await d.transaction(async (tx) => {
    let order
    for (let attempt = 0; !order; attempt++) {
      const rows = await tx
        .insert(orders)
        .values({
          code: newCode(),
          serviceDate: input.serviceDate,
          customerName: input.customerName,
          phone: input.phone,
          deliveryPointId: point.id,
          addressLabel: `${point.name}, ${point.address}`,
          lat: point.lat,
          lon: point.lon,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          totalCents: priced.totalCents,
        })
        .onConflictDoNothing({ target: orders.code })
        .returning()
      order = rows[0]
      if (!order && attempt > 5) throw new Error('Could not generate a unique order code')
    }
    await tx.insert(orderLines).values(priced.lines.map((l) => ({ ...l, orderId: order.id })))
    return order.code
  })

  return { ok: true, code }
}

/** Changes an order status; the first move to "livree" records the delivery time. */
export async function setOrderStatus(orderId: number, status: OrderStatus) {
  const d = await db()
  const [before] = await d.select().from(orders).where(eq(orders.id, orderId))
  if (!before) return
  const firstDelivery = status === 'livree' && !before.deliveredAt
  await d
    .update(orders)
    .set({ status, deliveredAt: firstDelivery ? new Date() : before.deliveredAt })
    .where(eq(orders.id, orderId))
}
