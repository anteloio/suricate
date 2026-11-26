import { OrderForm } from '@/components/order-form'
import { PageTitle } from '@/components/page-title'
import { getDeliveryPoints, getMenu, getOrderableDays, getSettings } from '@/lib/queries'
import { formatCutoff, relativeDay } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const settings = await getSettings()
  const [menu, openDays, points] = await Promise.all([
    getMenu(),
    getOrderableDays(settings.cutoffMinutes),
    getDeliveryPoints(),
  ])
  // No delivery point: nothing can be ordered, same as no open day.
  const days = points.length > 0 ? openDays : []
  const cutoff = formatCutoff(settings.cutoffMinutes)

  return (
    <main className='mx-auto max-w-2xl px-4 pt-6 pb-40'>
      <PageTitle
        title='Nos sandwichs'
        subtitle={
          <>
            Commandez avant <strong>{cutoff}</strong>, livraison <strong>{settings.deliveryWindow}</strong>{' '}
            {points.length === 1 ? `au ${points[0].name}` : 'au point de livraison de votre choix'}.
            <br />
            Livraison offerte · paiement en ligne
          </>
        }
      />

      {days.length === 0 ? (
        <section className='mt-10 rounded-2xl border border-neutral-200 bg-white p-6 text-center'>
          <p className='text-lg font-medium'>Pas de livraison prévue pour le moment.</p>
          <p className='mt-1 text-neutral-600'>
            Revenez bientôt : les prochains jours de livraison seront ouverts ici.
          </p>
        </section>
      ) : (
        <OrderForm
          menu={menu.map(({ id, category, name, description, priceCents, variants, active }) => ({
            id,
            category,
            name,
            description,
            priceCents,
            variants,
            active,
          }))}
          days={days.map((date) => ({ date, label: relativeDay(date) }))}
          rules={{
            formulePriceCents: settings.formulePriceCents,
          }}
          deliveryPoints={points.map(({ id, name, address }) => ({ id, name, address }))}
          cutoff={cutoff}
          deliveryWindow={settings.deliveryWindow}
        />
      )}
    </main>
  )
}
