import { getDeliveryPoints } from '@/lib/queries'
import { DeliveryPointEditor, NewDeliveryPointButton } from './delivery-point-form'

export default async function DeliveryPointsPage() {
  const points = await getDeliveryPoints({ includeInactive: true })
  return (
    <main className='space-y-8'>
      <div>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-2xl font-semibold'>Points de livraison</h1>
          <NewDeliveryPointButton />
        </div>
        <p className='mt-1 text-neutral-600'>
          Les clients choisissent l’un de ces points en commandant. Les modifications sont enregistrées toutes seules.
          Désactivez un point pour le retirer du site sans toucher aux commandes passées.
        </p>
      </div>
      <div className='space-y-3'>
        {points.map((p) => (
          <DeliveryPointEditor key={p.id} point={p} />
        ))}
      </div>
    </main>
  )
}
