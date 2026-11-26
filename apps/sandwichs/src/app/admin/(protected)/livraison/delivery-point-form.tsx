'use client'

import { Plus, X } from 'lucide-react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { DeliveryPointRow } from '@/lib/db/schema'
import { mapsUrl } from '@/lib/delivery-points'
import { useFormToast } from '@/lib/use-form-toast'
import { saveDeliveryPoint } from '../../actions'

/**
 * An existing point: saved on its own, no button. A text field saves when it loses focus (if it
 * changed), the "Actif" switch saves when tapped.
 */
export function DeliveryPointEditor({ point }: { point: DeliveryPointRow }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [active, setActive] = useState(point.active)
  const [, startTransition] = useTransition()

  function save(nextActive = active) {
    const data = new FormData(formRef.current!)
    if (nextActive) data.set('active', 'on')
    startTransition(async () => {
      const result = await saveDeliveryPoint(undefined, data)
      if (result?.error) toast.error(result.error)
      else toast.success('Enregistré')
    })
  }

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.currentTarget.value.trim() !== e.currentTarget.defaultValue.trim()) save()
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className={`card space-y-3 transition-opacity ${active ? '' : 'opacity-60'}`}
    >
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
            save(next)
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

/** "Ajouter un point" button opening a modal with the form; it closes once the point is added. */
export function NewDeliveryPointButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, action, pending] = useActionState(saveDeliveryPoint, undefined)
  useFormToast(state)
  useEffect(() => {
    if (state?.ok) dialogRef.current?.close()
  }, [state])

  return (
    <>
      <button
        type='button'
        className='btn-primary flex shrink-0 items-center gap-1.5'
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus className='size-4' aria-hidden />
        Ajouter un point
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby='new-point-title'
        className='m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-black/30'
        // A tap on the dimmed background closes it.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <form action={action} className='space-y-4 p-5'>
          <div className='flex items-center justify-between'>
            <h2 id='new-point-title' className='text-lg font-semibold'>
              Nouveau point de livraison
            </h2>
            <button
              type='button'
              aria-label='Fermer'
              className='-m-1 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100'
              onClick={() => dialogRef.current?.close()}
            >
              <X className='size-5' aria-hidden />
            </button>
          </div>
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
          <div className='flex justify-end gap-2'>
            <button type='button' className='btn-secondary' onClick={() => dialogRef.current?.close()}>
              Annuler
            </button>
            <button disabled={pending} className='btn-primary'>
              {pending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      // Same height as the text fields, so it lines up with the "Nom" input.
      className='flex h-[46px] shrink-0 items-center gap-2 text-sm font-medium text-neutral-700'
    >
      <span
        className={`relative h-6 w-10 rounded-full transition-colors ${checked ? 'bg-neutral-900' : 'bg-neutral-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
      {label}
    </button>
  )
}
