'use client'

import { useActionState } from 'react'
import type { DeliveryPointRow } from '@/lib/db/schema'
import { mapsUrl } from '@/lib/delivery-points'
import { saveDeliveryPoint } from '../../actions'

export function DeliveryPointForm({ point }: { point: DeliveryPointRow | null }) {
  const [state, action, pending] = useActionState(saveDeliveryPoint, undefined)
  return (
    // React resets the form after the action: the "new point" form is empty again once added.
    <form action={action} className={`card space-y-3 ${point && !point.active ? 'opacity-60' : ''}`}>
      {point && <input type='hidden' name='id' value={point.id} />}
      <label className='block'>
        <span className='label'>Nom</span>
        <input
          name='name'
          required
          defaultValue={point?.name}
          placeholder='Ex : Mairie de Valbonne (parking)'
          className='input mt-1'
        />
      </label>
      <label className='block'>
        <span className='label'>Adresse</span>
        <input
          name='address'
          required
          defaultValue={point?.address}
          placeholder='Ex : 1 place de l’Hôtel de Ville, 06560 Valbonne'
          className='input mt-1'
        />
      </label>
      <label className='block'>
        <span className='label'>Lien Google Maps (facultatif)</span>
        <input
          name='mapsUrl'
          type='url'
          inputMode='url'
          defaultValue={point?.mapsUrl}
          placeholder='https://maps.app.goo.gl/…'
          className='input mt-1'
        />
      </label>
      <div className='flex flex-wrap items-center gap-3'>
        {point && (
          <label className='flex items-center gap-2 text-sm'>
            <input type='checkbox' name='active' defaultChecked={point.active} className='size-4' />
            Actif
          </label>
        )}
        <button disabled={pending} className='btn-primary'>
          {pending ? 'Enregistrement…' : point ? 'Enregistrer' : 'Ajouter'}
        </button>
        {point && (
          <a href={mapsUrl(point.address, point.mapsUrl)} target='_blank' className='text-sm underline'>
            Voir sur la carte
          </a>
        )}
        {state?.error && <span className='text-sm text-red-600'>{state.error}</span>}
        {state?.ok && !pending && <span className='text-sm text-green-700'>{state.ok}</span>}
      </div>
    </form>
  )
}
