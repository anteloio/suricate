import 'server-only'
import { randomInt } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

z.config(z.locales.fr())
import { cartItemSchema, priceCart } from './cart'
import { db, orderLines, orders, type Order, type OrderStatus } from './db'
import { findDeliveryPoint } from './delivery-points'
import { orderNumberPrefix } from './order-number'
import { getMenu, getOrderableDays, getSettings } from './queries'
import { createCheckout, getCheckoutStatus } from './sumup'

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
  notes: z.string().trim().max(500).default(''),
  website: z.string().max(0).optional(), // honeypot: bots fill it, humans never see it
})
export type OrderInput = z.input<typeof orderInputSchema>

export type CreateOrderResult = { ok: true; code: string; paymentUrl: string } | { ok: false; error: string }

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function newCode() {
  return Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
}

/**
 * Saves the order as "a_payer" and opens its SumUp payment; the customer is then sent to
 * `paymentUrl`. `siteUrl` is the public address SumUp sends the customer and the webhook back to.
 */
export async function createOrder(raw: unknown, siteUrl: string): Promise<CreateOrderResult> {
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
          status: 'a_payer',
          paymentMethod: 'En ligne',
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

  let checkout
  try {
    checkout = await createCheckout({
      reference: code,
      amountCents: priced.totalCents,
      description: `Suricate · commande ${code}`,
      redirectUrl: `${siteUrl}/commande/${code}?nouvelle=1`,
      // SumUp can only call a public https address.
      webhookUrl: siteUrl.startsWith('https://') ? `${siteUrl}/api/sumup/webhook` : undefined,
    })
  } catch (err) {
    console.error('SumUp checkout failed', err)
    await d.update(orders).set({ status: 'annulee' }).where(eq(orders.code, code))
    return { ok: false, error: 'Le paiement en ligne est indisponible pour le moment. Réessayez dans un instant.' }
  }
  await d.update(orders).set({ sumupCheckoutId: checkout.id, paymentUrl: checkout.url }).where(eq(orders.code, code))

  return { ok: true, code, paymentUrl: checkout.url }
}

/**
 * Asks SumUp whether an order waiting for payment has been paid, and if so confirms it (it then
 * shows up in Bruno's admin). Called by the order page and by SumUp's webhook.
 */
export async function syncPayment(order: Order): Promise<Order> {
  if (order.status !== 'a_payer' || !order.sumupCheckoutId) return order
  let status
  try {
    status = await getCheckoutStatus(order.sumupCheckoutId)
  } catch (err) {
    console.error('SumUp status check failed', err)
    return order
  }
  if (status !== 'PAID') return order
  return confirmPaidOrder(order)
}

/**
 * Confirms a paid order and gives it the next number of its delivery day ("20261127-001").
 * Two payments confirmed at the same instant may compute the same number: the unique index
 * refuses the second one, which retries.
 */
async function confirmPaidOrder(order: Order): Promise<Order> {
  const d = await db()
  const prefix = orderNumberPrefix(order.serviceDate)
  for (let attempt = 0; ; attempt++) {
    try {
      const [paid] = await d
        .update(orders)
        .set({
          status: 'confirmee',
          paidAt: new Date(),
          number: sql`${prefix} || '-' || lpad((
            select count(*) + 1 from ${orders} as o
            where o.service_date = ${order.serviceDate} and o.number is not null
          )::text, 3, '0')`,
        })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'a_payer')))
        .returning()
      return paid ?? order
    } catch (err) {
      if (attempt >= 5) throw err
    }
  }
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
