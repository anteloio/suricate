import { notFound } from 'next/navigation'
import { Logo } from '@/components/logo'
import { formatEuros } from '@/lib/money'
import { getOrderByCode, getSettings } from '@/lib/queries'
import { formatDay } from '@/lib/time'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { label: string; className: string }> = {
  confirmee: { label: 'Confirmée', className: 'bg-neutral-100 text-neutral-800' },
  livree: { label: 'Livrée', className: 'bg-green-100 text-green-800' },
  annulee: { label: 'Annulée', className: 'bg-red-100 text-red-800' },
}

export default async function OrderPage({ params, searchParams }: PageProps<'/commande/[code]'>) {
  const { code } = await params
  const { nouvelle } = await searchParams
  const [found, settings] = await Promise.all([getOrderByCode(code), getSettings()])
  if (!found) notFound()
  const { order, lines } = found
  const status = STATUS[order.status]

  return (
    <main className='mx-auto max-w-xl px-4 py-8'>
      <div className='text-center'>
        <Logo className='mx-auto h-12 w-auto' />
      </div>
      {nouvelle && (
        <p className='mt-6 rounded-2xl bg-green-50 px-4 py-4 text-center text-green-900 ring-1 ring-green-200'>
          Merci {order.customerName.split(' ')[0]} ! Votre commande est bien enregistrée.
          <br />
          Gardez cette page : elle affiche l’état de votre commande.
        </p>
      )}
      <section className='card mt-6 space-y-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Commande {order.code}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>{status.label}</span>
        </div>
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
    </main>
  )
}
