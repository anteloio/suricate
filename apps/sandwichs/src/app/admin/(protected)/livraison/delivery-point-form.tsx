'use client'

import { useState } from 'react'
import { AddDialog, Switch, useAutoSave } from '@/components/admin-form'
import type { DeliveryPointRow } from '@/lib/db/schema'
import { mapsUrl } from '@/lib/delivery-points'
import { saveDeliveryPoint } from '../../actions'

const on = (value: boolean) => (value ? 'on' : null)

/** An existing point: saves itself (fields on blur, "Actif" when tapped). */
export function DeliveryPointEditor({ point }: { point: DeliveryPointRow }) {
  const [active, setActive] = useState(point.active)
  const { formProps, save, onBlur } = useAutoSave(saveDeliveryPoint, () => ({ active: on(active) }))

  return (
    <form {...formProps} className={`card space-y-3 transition-opacity ${active ? '' : 'opacity-60'}`}>
      <input type='hidden' name='id' value={point.id} />
      <div className='flex items-end gap-4'>
        <label className='block min-w-0 flex-1'>
          <span className='label'>Nom</span>
          <input name='name' required defaultValue={point.name} onBlur={onBlur} className='input mt-1' />
        </label>
        <Switch
          label='Actif'
          checked={active}
          onChange={(next) => {
            setActive(next)
            save({ active: on(next) })
          }}
        />
      </div>
      <label className='block'>
        <span className='label'>Adresse</span>
        <input name='address' required defaultValue={point.address} onBlur={onBlur} className='input mt-1' />
      </label>
      <a href={mapsUrl(point.address)} target='_blank' className='inline-block text-sm underline'>
        Voir sur la carte
      </a>
    </form>
  )
}

export function NewDeliveryPointButton() {
  return (
    <AddDialog buttonLabel='Ajouter un point' title='Nouveau point de livraison' action={saveDeliveryPoint}>
      <label className='block'>
        <span className='label'>Nom</span>
        <input name='name' required placeholder='Ex : Mairie de Valbonne (parking)' className='input mt-1' />
      </label>
      <label className='block'>
        <span className='label'>Adresse</span>
        <input
          name='address'
          required
          placeholder='Ex : 1 place de l’Hôtel de Ville, 06560 Valbonne'
          className='input mt-1'
        />
      </label>
    </AddDialog>
  )
}
