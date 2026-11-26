import 'server-only'
import { and, asc, count, desc, eq, gte, inArray, ne, notInArray } from 'drizzle-orm'
import { db, deliveryPoints, orderLines, orders, products, serviceDays, settings, type Settings } from './db'
import type { HistoryOrder } from './order-history'
import { addDays, orderableDays, parisNow } from './time'

export async function getSettings(): Promise<Settings> {
  const d = await db()
  const [row] = await d.select().from(settings).where(eq(settings.id, 1))
  if (row) return row
  const [created] = await d.insert(settings).values({ id: 1 }).returning()
  return created
}

export async function getMenu({ includeInactive = false } = {}) {
  const d = await db()
  return d
    .select()
    .from(products)
    .where(includeInactive ? undefined : eq(products.active, true))
    .orderBy(asc(products.position), asc(products.id))
}

/** Delivery points, oldest first; the customer site only gets the active ones. */
export async function getDeliveryPoints({ includeInactive = false } = {}) {
  const d = await db()
  return d
    .select()
    .from(deliveryPoints)
    .where(includeInactive ? undefined : eq(deliveryPoints.active, true))
    .orderBy(asc(deliveryPoints.createdAt), asc(deliveryPoints.id))
}

/** Open days from today on (Paris time). */
export async function getUpcomingOpenDays(): Promise<string[]> {
  const d = await db()
  const rows = await d
    .select({ date: serviceDays.date })
    .from(serviceDays)
    .where(gte(serviceDays.date, parisNow().date))
    .orderBy(asc(serviceDays.date))
  return rows.map((r) => r.date)
}

export async function getOrderableDays(cutoffMinutes: number) {
  return orderableDays(await getUpcomingOpenDays(), cutoffMinutes)
}

export async function getOrderByCode(code: string) {
  const d = await db()
  const [order] = await d.select().from(orders).where(eq(orders.code, code.toUpperCase()))
  if (!order) return null
  const lines = await d.select().from(orderLines).where(eq(orderLines.orderId, order.id)).orderBy(asc(orderLines.id))
  return { order, lines }
}

/** The day's orders for Bruno: only paid ones (an order waiting for its payment is not his yet). */
export async function getOrdersForDay(date: string) {
  const d = await db()
  const dayOrders = await d
    .select()
    .from(orders)
    .where(and(eq(orders.serviceDate, date), ne(orders.status, 'a_payer')))
    .orderBy(asc(orders.createdAt))
  const lines = dayOrders.length
    ? await d
        .select()
        .from(orderLines)
        .where(
          inArray(
            orderLines.orderId,
            dayOrders.map((o) => o.id)
          )
        )
        .orderBy(asc(orderLines.id))
    : []
  return dayOrders.map((order) => ({ order, lines: lines.filter((l) => l.orderId === order.id) }))
}

/** Number of paid, non-cancelled orders per day, for the days screen. */
export async function getOrderCountsFrom(date: string): Promise<Map<string, number>> {
  const d = await db()
  const rows = await d
    .select({ date: orders.serviceDate, n: count() })
    .from(orders)
    .where(and(gte(orders.serviceDate, date), notInArray(orders.status, ['annulee', 'a_payer'])))
    .groupBy(orders.serviceDate)
  return new Map(rows.map((r) => [r.date, Number(r.n)]))
}

/** Days that have orders, most recent first (admin day picker). */
export async function getRecentOrderDays(limit = 30): Promise<string[]> {
  const d = await db()
  const rows = await d
    .selectDistinct({ date: orders.serviceDate })
    .from(orders)
    .where(and(gte(orders.serviceDate, addDays(parisNow().date, -90)), ne(orders.status, 'a_payer')))
    .orderBy(desc(orders.serviceDate))
    .limit(limit)
  return rows.map((r) => r.date)
}

/** "Mes commandes": only the orders whose codes the customer's device holds (no listing). */
export async function getOrdersByCodes(codes: string[]): Promise<HistoryOrder[]> {
  if (codes.length === 0) return []
  const d = await db()
  const found = await d.select().from(orders).where(inArray(orders.code, codes))
  const lines = found.length
    ? await d
        .select()
        .from(orderLines)
        .where(
          inArray(
            orderLines.orderId,
            found.map((o) => o.id)
          )
        )
        .orderBy(asc(orderLines.id))
    : []
  return found
    .map((o) => ({
      code: o.code,
      number: o.number,
      serviceDate: o.serviceDate,
      status: o.status,
      totalCents: o.totalCents,
      paymentMethod: o.paymentMethod,
      where: o.addressLabel,
      lines: lines.filter((l) => l.orderId === o.id).map((l) => ({ label: l.label, quantity: l.quantity })),
    }))
    .sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code))
}
