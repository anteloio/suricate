import Link from 'next/link'
import { DeliverButton } from '@/components/deliver-button'
import { PrintButton } from '@/components/print-button'
import { StatusBadge } from '@/components/status-badge'
import { productionTotals } from '@/lib/cart'
import { formatEuros } from '@/lib/money'
import { orderLabel } from '@/lib/order-number'
import { mapsUrl } from '@/lib/delivery-points'
import { getDeliveryPoints, getOrdersForDay, getRecentOrderDays, getSettings, getUpcomingOpenDays } from '@/lib/queries'
import { formatCutoff, formatDay, parisNow, relativeDay } from '@/lib/time'
import { deliveredWhatsAppLink } from '@/lib/whatsapp'
import { changeOrderStatus } from '../actions'

export default async function OrdersPage({ searchParams }: PageProps<'/admin'>) {
  const { date: requested } = await searchParams
  const now = parisNow()
  const [settings, openDays, orderDays, points] = await Promise.all([
    getSettings(),
    getUpcomingOpenDays(),
    getRecentOrderDays(),
    getDeliveryPoints({ includeInactive: true }),
  ])
  const pointNames = new Map(points.map((p) => [p.id, p.name]))
  const whatsappLink = (order: Parameters<typeof deliveredWhatsAppLink>[0] & { deliveryPointId: string | null }) =>
    deliveredWhatsAppLink({ ...order, pointName: pointNames.get(order.deliveryPointId ?? '') })

  const date =
    typeof requested === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? requested
      : openDays.includes(now.date) || orderDays.includes(now.date)
        ? now.date
        : (openDays[0] ?? now.date)
  const pickerDays = [...new Set([now.date, date, ...openDays.slice(0, 5), ...orderDays.slice(0, 5)])].sort()

  const dayOrders = await getOrdersForDay(date)
  const active = dayOrders.filter((o) => o.order.status !== 'annulee')
  const production = productionTotals(active.flatMap((o) => o.lines))
  const revenue = active.reduce((sum, o) => sum + o.order.totalCents, 0)
  const byPayment = new Map<string, number>()
  for (const { order } of active)
    byPayment.set(order.paymentMethod, (byPayment.get(order.paymentMethod) ?? 0) + order.totalCents)

  const isOpen = openDays.includes(date)
  const stillOrdering = isOpen && (date > now.date || (date === now.date && now.minutes < settings.cutoffMinutes))

  return (
    <main className='space-y-6'>
      <nav className='no-print flex flex-wrap gap-2'>
        {pickerDays.map((d) => (
          <Link key={d} href={`/admin?date=${d}`} className={`chip ${d === date ? 'chip-selected' : ''}`}>
            {relativeDay(d, now)}
          </Link>
        ))}
      </nav>

      <div>
        <h1 className='text-2xl font-semibold first-letter:uppercase'>{formatDay(date)}</h1>
        <p className='text-neutral-600'>
          {!isOpen
            ? 'Jour non ouvert aux commandes.'
            : stillOrdering
              ? `Commandes ouvertes jusqu'à ${formatCutoff(settings.cutoffMinutes)}${date === now.date ? '' : ' le jour même'}.`
              : 'Commandes fermées.'}{' '}
          {active.length} commande{active.length > 1 ? 's' : ''} · {formatEuros(revenue)}
          {[...byPayment.entries()].map(([m, c]) => ` · ${m} ${formatEuros(c)}`).join('')}
        </p>
      </div>

      {production.length > 0 && (
        <section className='card'>
          <h2 className='font-semibold'>À préparer</h2>
          <ul className='mt-2 grid gap-x-6 sm:grid-cols-2'>
            {production.map((p) => (
              <li key={p.name} className='flex justify-between border-b border-neutral-100 py-1'>
                <span>{p.name}</span>
                <strong className='tabular-nums'>{p.quantity}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dayOrders.length > 0 && (
        <div className='no-print'>
          <PrintButton />
        </div>
      )}

      {dayOrders.length === 0 ? (
        <p className='card text-neutral-500'>Aucune commande pour ce jour.</p>
      ) : (
        <ul className='space-y-3'>
          {dayOrders.map(({ order, lines }) => (
            <li key={order.id} className={`card break-inside-avoid ${order.status === 'annulee' ? 'opacity-60' : ''}`}>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='text-lg font-semibold'>
                    {order.customerName}
                    {order.company && <span className='font-normal text-neutral-500'> · {order.company}</span>}
                  </p>
                  <p className='text-sm text-neutral-500'>
                    {orderLabel(order)} · commandé à{' '}
                    {order.createdAt.toLocaleTimeString('fr-FR', {
                      timeZone: 'Europe/Paris',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <StatusBadge status={order.status} admin />
              </div>
              <ul className='mt-3'>
                {lines.map((l) => (
                  <li key={l.id}>
                    <strong>{l.quantity} ×</strong> {l.label}
                  </li>
                ))}
              </ul>
              <div className='mt-3 grid gap-1 text-sm text-neutral-700'>
                <p>
                  📍{' '}
                  <a className='underline' target='_blank' href={mapsUrl(order.addressLabel)}>
                    {order.addressLabel}
                  </a>
                  {order.addressDetails && <> · {order.addressDetails}</>}
                </p>
                <p>
                  📞{' '}
                  <a className='underline' href={`tel:${order.phone.replace(/\s/g, '')}`}>
                    {order.phone}
                  </a>
                </p>
                <p>
                  💶 <strong>{formatEuros(order.totalCents)}</strong>{' '}
                  {order.paymentMethod === 'En ligne' ? 'payé en ligne' : `en ${order.paymentMethod}`}
                </p>
                {order.notes && <p className='rounded-lg bg-amber-50 px-2 py-1'>💬 {order.notes}</p>}
              </div>
              <div className='no-print mt-3 flex flex-wrap gap-2'>
                {(['livree', 'confirmee', 'annulee'] as const)
                  .filter((s) => s !== order.status)
                  .map((s) =>
                    s === 'livree' && !order.deliveredAt ? (
                      // First delivery: save the status, then open WhatsApp with the message ready.
                      <DeliverButton
                        key={s}
                        orderId={order.id}
                        whatsappUrl={whatsappLink(order)}
                        className='btn-secondary border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700'
                      />
                    ) : (
                      <form key={s} action={changeOrderStatus}>
                        <input type='hidden' name='orderId' value={order.id} />
                        <input type='hidden' name='status' value={s} />
                        <button className='btn-secondary'>
                          {s === 'livree' ? 'Livrée' : s === 'confirmee' ? 'Remettre à préparer' : 'Annuler'}
                        </button>
                      </form>
                    )
                  )}
                {order.status === 'livree' && whatsappLink(order) && (
                  <a className='btn-secondary' href={whatsappLink(order)!}>
                    Renvoyer le WhatsApp
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
