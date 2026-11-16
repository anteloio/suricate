import 'server-only'
import { randomInt } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

z.config(z.locales.fr())
import { cartItemSchema, priceCart } from './cart'
import { db, orderLines, orders, PAYMENT_METHODS, type OrderStatus } from './db'
import { confirmationEmail, onTheWayEmail, sendEmail } from './email'
import { isInZone } from './geo'
import { getMenu, getOrderableDays, getSettings } from './queries'

export const orderInputSchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(cartItemSchema).min(1).max(30),
  customerName: z.string().trim().min(2, 'Indiquez votre nom.').max(80),
  email: z.email('Adresse e-mail invalide.').max(200),
  phone: z
    .string()
    .trim()
    .refine(
      (p) => /^\+?[\d\s.-]{10,20}$/.test(p) && p.replace(/\D/g, '').length >= 10,
      'Numéro de téléphone invalide.'
    ),
  company: z.string().trim().max(120).default(''),
  address: z.object({ label: z.string().trim().min(3, 'Adresse invalide.').max(200), lat: z.number(), lon: z.number() }),
  addressDetails: z.string().trim().max(200).default(''),
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
  if (!isInZone(input.address, s)) {
    return { ok: false, error: `Désolé, nous livrons uniquement à ${s.zoneLabel}.` }
  }
  const priced = priceCart(input.items, menu, s)
  if (!priced.ok) return { ok: false, error: priced.error }

  const d = await db()
  const created = await d.transaction(async (tx) => {
    let order
    for (let attempt = 0; !order; attempt++) {
      const rows = await tx
        .insert(orders)
        .values({
          code: newCode(),
          serviceDate: input.serviceDate,
          customerName: input.customerName,
          email: input.email.toLowerCase(),
          phone: input.phone,
          company: input.company,
          addressLabel: input.address.label,
          addressDetails: input.addressDetails,
          lat: input.address.lat,
          lon: input.address.lon,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          totalCents: priced.totalCents,
        })
        .onConflictDoNothing({ target: orders.code })
        .returning()
      order = rows[0]
      if (!order && attempt > 5) throw new Error('Could not generate a unique order code')
    }
    const lines = await tx
      .insert(orderLines)
      .values(priced.lines.map((l) => ({ ...l, orderId: order.id })))
      .returning()
    return { order, lines }
  })

  await sendEmail(confirmationEmail(created.order, created.lines, s.deliveryWindow))
  return { ok: true, code: created.order.code }
}

/** Changes an order status; moving to "en_route" emails the customer once. */
export async function setOrderStatus(orderId: number, status: OrderStatus) {
  const d = await db()
  const [before] = await d.select().from(orders).where(eq(orders.id, orderId))
  if (!before) return
  const [after] = await d
    .update(orders)
    .set({ status, dispatchedAt: status === 'en_route' && !before.dispatchedAt ? new Date() : before.dispatchedAt })
    .where(eq(orders.id, orderId))
    .returning()
  if (status === 'en_route' && !before.dispatchedAt) await sendEmail(onTheWayEmail(after))
}
