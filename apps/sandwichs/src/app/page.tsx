import Link from 'next/link'
import { Logo } from '@/components/logo'
import { OrderForm } from '@/components/order-form'
import { DELIVERY_POINTS } from '@/lib/delivery-points'
import { formatEuros } from '@/lib/money'
import { getMenu, getOrderableDays, getSettings } from '@/lib/queries'
import { formatCutoff, relativeDay } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const settings = await getSettings()
  const [menu, days] = await Promise.all([getMenu(), getOrderableDays(settings.cutoffMinutes)])
  const cutoff = formatCutoff(settings.cutoffMinutes)

  return (
    <main className='mx-auto max-w-2xl px-4 pb-40 pt-8'>
      <nav className='flex justify-end'>
        <Link href='/mes-commandes' className='btn-secondary'>
          Mes commandes
        </Link>
      </nav>
      <header className='text-center'>
        <Logo className='mx-auto h-16 w-auto' />
        <h1 className='mt-2 font-serif text-2xl tracking-[0.2em] text-brand uppercase'>Nos sandwichs</h1>
        <p className='mt-3 text-neutral-600'>
          Commandez avant <strong>{cutoff}</strong>, livraison <strong>{settings.deliveryWindow}</strong>{' '}
          {DELIVERY_POINTS.length === 1 ? `au ${DELIVERY_POINTS[0].name}` : 'au point de livraison de votre choix'}.
          <br />
          Livraison offerte · minimum {formatEuros(settings.minOrderCents)} · paiement à la livraison
        </p>
      </header>

      {days.length === 0 ? (
        <section className='mt-10 rounded-2xl border border-neutral-200 bg-white p-6 text-center'>
          <p className='text-lg font-medium'>Pas de livraison prévue pour le moment.</p>
          <p className='mt-1 text-neutral-600'>
            Revenez bientôt : les prochains jours de livraison seront ouverts ici.
          </p>
        </section>
      ) : (
        <OrderForm
          menu={menu.map(({ id, category, name, description, priceCents, formulaEligible, variants, active }) => ({
            id,
            category,
            name,
            description,
            priceCents,
            formulaEligible,
            variants,
            active,
          }))}
          days={days.map((date) => ({ date, label: relativeDay(date) }))}
          rules={{
            formulePriceCents: settings.formulePriceCents,
            minOrderCents: settings.minOrderCents,
          }}
          deliveryPoints={[...DELIVERY_POINTS]}
          cutoff={cutoff}
          deliveryWindow={settings.deliveryWindow}
        />
      )}
    </main>
  )
}
