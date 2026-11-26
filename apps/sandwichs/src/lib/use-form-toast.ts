'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

/** Shows a Server Action's result ({ ok } or { error }) as a toast instead of text in the form. */
export function useFormToast(state: { ok?: string; error?: string } | undefined) {
  useEffect(() => {
    if (state?.ok) toast.success(state.ok)
    else if (state?.error) toast.error(state.error)
  }, [state])
}
