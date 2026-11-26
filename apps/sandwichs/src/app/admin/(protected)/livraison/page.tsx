import { getDeliveryPoints } from '@/lib/queries'
import { DeliveryPointForm } from './delivery-point-form'

export default async function DeliveryPointsPage() {
  const points = await getDeliveryPoints({ includeInactive: true })
  return (
    <main className='space-y-8'>
      <div>
        <h1 className='text-2xl font-semibold'>Points de livraison</h1>
        <p className='mt-1 text-neutral-600'>
          Les clients choisissent l’un de ces points en commandant. Décochez « actif » pour retirer un point du site
          sans toucher aux commandes passées.
        </p>
      </div>
      <div className='space-y-3'>
        {points.map((p) => (
          <DeliveryPointForm key={p.id} point={p} />
        ))}
      </div>
      <section>
        <h2 className='section-title'>Ajouter un point</h2>
        <div className='mt-3'>
          <DeliveryPointForm point={null} />
        </div>
      </section>
    </main>
  )
}
