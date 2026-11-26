'use client'

// Building blocks shared by the admin's editable lists (Menu, Livraison): rows that save
// themselves, on/off switches, and an "add" button opening a modal.

import { Plus, X } from 'lucide-react'
import { useActionState, useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import type { FormState } from '@/app/admin/actions'
import { useFormToast } from '@/lib/use-form-toast'

type Action = (state: FormState, formData: FormData) => Promise<FormState>

/**
 * A form with no save button: a text field saves when it loses focus (if it changed), a select
 * or a switch saves right away. Switches are not form fields: `switches()` gives their current
 * values ('on' or null), and `save(overrides)` can pass a switch's new value right away.
 */
export function useAutoSave(action: Action, switches: () => Record<string, string | null> = () => ({})) {
  const formRef = useRef<HTMLFormElement>(null)
  const [, startTransition] = useTransition()

  function save(overrides: Record<string, string | null> = {}) {
    const data = new FormData(formRef.current!)
    for (const [key, value] of Object.entries({ ...switches(), ...overrides })) {
      if (value === null) data.delete(key)
      else data.set(key, value)
    }
    startTransition(async () => {
      const result = await action(undefined, data)
      if (result?.error) toast.error(result.error)
      else toast.success('Enregistré')
    })
  }

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.currentTarget.value.trim() !== e.currentTarget.defaultValue.trim()) save()
  }

  const formProps = {
    ref: formRef,
    onSubmit: (e: React.FormEvent) => {
      e.preventDefault()
      save()
    },
  }
  return { formProps, save, onBlur }
}

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
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

/** Small "+ label" button opening a modal with the form; the modal closes once saved. */
export function AddDialog({
  buttonLabel,
  title,
  action,
  children,
}: {
  buttonLabel: string
  title: string
  action: Action
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction, pending] = useActionState(action, undefined)
  useFormToast(state)
  useEffect(() => {
    if (state?.ok) dialogRef.current?.close()
  }, [state])
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type='button'
        className='flex h-8 shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-3 text-sm font-medium text-white transition hover:bg-neutral-700'
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus className='size-4' aria-hidden />
        {buttonLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-label={title}
        className='m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-black/30'
        // A tap on the dimmed background closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {/* React empties the form after the action, ready for the next one. */}
        <form action={formAction} className='space-y-4 p-5'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>{title}</h2>
            <button
              type='button'
              aria-label='Fermer'
              className='-m-1 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100'
              onClick={close}
            >
              <X className='size-5' aria-hidden />
            </button>
          </div>
          {children}
          <div className='flex justify-end gap-2'>
            <button type='button' className='btn-secondary' onClick={close}>
              Annuler
            </button>
            <button disabled={pending} className='btn-primary py-2'>
              {pending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
