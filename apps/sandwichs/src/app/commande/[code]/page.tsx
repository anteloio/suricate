import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageTitle } from '@/components/page-title'
import { StatusBadge } from '@/components/status-badge'
import { formatEuros } from '@/lib/money'
import { orderLabel } from '@/lib/order-number'
import { syncPayment } from '@/lib/orders'
import { getOrderByCode, getSettings } from '@/lib/queries'
import { formatDay } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function OrderPage({ params, searchParams }: PageProps<'/commande/[code]'>) {
  const { code } = await params
  const { nouvelle } = await searchParams
  const [found, settings] = await Promise.all([getOrderByCode(code), getSettings()])
  if (!found) notFound()
  const { lines } = found
  // Back from SumUp's page (or the webhook hasn't arrived yet): ask SumUp whether it is paid.
  const order = await syncPayment(found.order)
  const unpaid = order.status === 'a_payer'

  return (
    <main className='mx-auto max-w-2xl px-4 pt-6 pb-12'>
      <PageTitle
        title={
          unpaid ? (
            'Votre commande'
          ) : (
            // The number never breaks at its dash on a phone.
            <>
              Commande <span className='whitespace-nowrap'>{orderLabel(order)}</span>
            </>
          )
        }
        subtitle={order.status === 'confirmee' ? undefined : <StatusBadge status={order.status} />}
      />
      {unpaid && (
        <div className='mt-6 space-y-3 rounded-2xl bg-amber-50 px-4 py-4 text-center text-amber-900 ring-1 ring-amber-200'>
          <p>
            Votre commande n’est pas encore payée.
            <br />
            Elle sera envoyée à Bruno dès le paiement reçu.
          </p>
          {order.paymentUrl && (
            <a href={order.paymentUrl} className='btn-primary inline-block'>
              Payer {formatEuros(order.totalCents)}
            </a>
          )}
        </div>
      )}
      {nouvelle && !unpaid && (
        <p className='mt-6 rounded-2xl bg-green-50 px-4 py-4 text-center text-green-900 ring-1 ring-green-200'>
          Merci {order.customerName.split(' ')[0]} ! Paiement reçu, votre commande est bien enregistrée.
          <br />
          Gardez cette page : elle affiche l’état de votre commande.
        </p>
      )}
      <section className='card mt-6 space-y-4'>
        <p className='text-neutral-700'>
          Livraison <strong>{formatDay(order.serviceDate)}</strong>, {settings.deliveryWindow}
          <br />
          {order.addressLabel}
          {order.addressDetails && (
            <>
              <br />
              {order.addressDetails}
            </>
          )}
        </p>
        <ul className='divide-y divide-neutral-200 border-y border-neutral-200'>
          {lines.map((l) => (
            <li key={l.id} className='flex justify-between gap-4 py-2'>
              <span>
                {l.quantity} × {l.label}
              </span>
              <span className='tabular-nums'>{formatEuros(l.quantity * l.unitPriceCents)}</span>
            </li>
          ))}
        </ul>
        <div className='flex justify-between text-lg font-semibold'>
          <span>Total</span>
          <span className='tabular-nums'>{formatEuros(order.totalCents)}</span>
        </div>
        <p className='text-sm text-neutral-600'>
          {order.paymentMethod !== 'En ligne'
            ? `Paiement à la livraison : ${order.paymentMethod}`
            : unpaid
              ? 'Paiement en ligne : en attente'
              : 'Payée en ligne'}
        </p>
      </section>
      {order.status === 'confirmee' && (
        <p className='mt-6 text-center text-sm text-neutral-500'>
          Vous recevrez un message WhatsApp dès que votre commande sera arrivée.
        </p>
      )}
      <p className='mt-8 text-center'>
        <Link href='/' className='btn-primary inline-block'>
          Nouvelle commande
        </Link>
      </p>
    </main>
  )
}
