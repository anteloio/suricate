import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageTitle } from '@/components/page-title'
import { StatusBadge } from '@/components/status-badge'
import { formatEuros } from '@/lib/money'
import { getOrderByCode, getSettings } from '@/lib/queries'
import { formatDay } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function OrderPage({ params, searchParams }: PageProps<'/commande/[code]'>) {
  const { code } = await params
  const { nouvelle } = await searchParams
  const [found, settings] = await Promise.all([getOrderByCode(code), getSettings()])
  if (!found) notFound()
  const { order, lines } = found

  return (
    <main className='mx-auto max-w-2xl px-4 pt-6 pb-12'>
      <PageTitle title={`Commande ${order.code}`} subtitle={<StatusBadge status={order.status} />} />
      {nouvelle && (
        <p className='mt-6 rounded-2xl bg-green-50 px-4 py-4 text-center text-green-900 ring-1 ring-green-200'>
          Merci {order.customerName.split(' ')[0]} ! Votre commande est bien enregistrée.
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
        <p className='text-sm text-neutral-600'>Paiement à la livraison : {order.paymentMethod}</p>
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
