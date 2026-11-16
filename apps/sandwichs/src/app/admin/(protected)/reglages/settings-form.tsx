'use client'

import { useActionState } from 'react'
import { saveSettings } from '../../actions'

type Values = {
  cutoff: string
  deliveryWindow: string
  minOrder: string
  formulePrice: string
  zoneRadiusKm: string
  zoneLabel: string
}

export function SettingsForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState(saveSettings, undefined)
  return (
    <form action={action} className='card mt-4 grid gap-4 sm:grid-cols-2'>
      <label>
        <span className='label'>Heure limite de commande</span>
        <input name='cutoff' type='time' required defaultValue={values.cutoff} className='input mt-1' />
      </label>
      <label>
        <span className='label'>Créneau de livraison</span>
        <input name='deliveryWindow' required defaultValue={values.deliveryWindow} className='input mt-1' />
      </label>
      <label>
        <span className='label'>Prix de la formule (€)</span>
        <input
          name='formulePrice'
          required
          inputMode='decimal'
          defaultValue={values.formulePrice}
          className='input mt-1'
        />
      </label>
      <label>
        <span className='label'>Commande minimum (€)</span>
        <input name='minOrder' required inputMode='decimal' defaultValue={values.minOrder} className='input mt-1' />
      </label>
      <label className='sm:col-span-2'>
        <span className='label'>Rayon de livraison autour de {values.zoneLabel} (km)</span>
        <input
          name='zoneRadiusKm'
          required
          inputMode='decimal'
          defaultValue={values.zoneRadiusKm}
          className='input mt-1 sm:w-40'
        />
      </label>
      <div className='flex items-center gap-3 sm:col-span-2'>
        <button disabled={pending} className='btn-primary'>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {state?.error && <span className='text-sm text-red-600'>{state.error}</span>}
        {state?.ok && !pending && <span className='text-sm text-green-700'>{state.ok}</span>}
      </div>
    </form>
  )
}
